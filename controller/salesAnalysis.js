const express = require("express");
const router = express.Router();
const Order = require("../model/order");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

// 🔹 Get sales analysis by category and region
router.get(
  "/category-region-analysis",
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log("🚀 Starting aggregation query...");

      // Aggregate sales data by region, area, and category
      const salesAnalysis = await Order.aggregate([
        { $unwind: "$cart" },
        {
          $group: {
            _id: {
              region: "$cart.shop.region",
              area: "$cart.shop.area",
              category: "$cart.category",
            },
            totalSales: {
              $sum: {
                $multiply: [
                  "$cart.qty",
                  { 
                    $cond: {
                      if: { $gt: ["$cart.discountPrice", 0] },
                      then: "$cart.discountPrice",
                      else: {
                        $cond: {
                          if: { $gt: ["$cart.originalPrice", 0] },
                          then: "$cart.originalPrice",
                          else: "$cart.price"
                        }
                      }
                    }
                  }
                ],
              },
            },
            totalQuantity: { $sum: "$cart.qty" },
          },
        },
        {
          $project: {
            _id: 0,
            region: "$_id.region",
            area: "$_id.area",
            category: "$_id.category",
            totalSales: 1,
            totalQuantity: 1,
          },
        },
        { $sort: { totalSales: -1 } },
      ]);

      // 🔹 Get region summary with fixed price calculation
      const regionSummary = await Order.aggregate([
        { $unwind: "$cart" },
        {
          $group: {
            _id: {
              region: "$cart.shop.region",
              area: "$cart.shop.area",
            },
            totalSales: {
              $sum: {
                $multiply: [
                  "$cart.qty",
                  { 
                    $cond: {
                      if: { $gt: ["$cart.discountPrice", 0] },
                      then: "$cart.discountPrice",
                      else: {
                        $cond: {
                          if: { $gt: ["$cart.originalPrice", 0] },
                          then: "$cart.originalPrice",
                          else: "$cart.price"
                        }
                      }
                    }
                  }
                ],
              },
            },
            totalOrders: { $sum: 1 },
            averageOrderValue: {
              $avg: {
                $multiply: [
                  "$cart.qty",
                  { 
                    $cond: {
                      if: { $gt: ["$cart.discountPrice", 0] },
                      then: "$cart.discountPrice",
                      else: {
                        $cond: {
                          if: { $gt: ["$cart.originalPrice", 0] },
                          then: "$cart.originalPrice",
                          else: "$cart.price"
                        }
                      }
                    }
                  }
                ],
              },
            },
          },
        },
        {
          $project: {
            region: "$_id.region",
            area: "$_id.area",
            totalSales: 1,
            totalOrders: 1,
            averageOrderValue: 1,
            _id: 0,
          },
        },
        { $sort: { totalSales: -1 } },
      ]);

      // 🔹 Get top categories by region with fixed price calculation
      const topCategoriesByRegion = await Order.aggregate([
        { $unwind: "$cart" },
        {
          $group: {
            _id: {
              region: "$cart.shop.region",
              area: "$cart.shop.area",
              category: "$cart.category",
            },
            totalSales: {
              $sum: {
                $multiply: [
                  "$cart.qty",
                  { 
                    $cond: {
                      if: { $gt: ["$cart.discountPrice", 0] },
                      then: "$cart.discountPrice",
                      else: {
                        $cond: {
                          if: { $gt: ["$cart.originalPrice", 0] },
                          then: "$cart.originalPrice",
                          else: "$cart.price"
                        }
                      }
                    }
                  }
                ],
              },
            },
          },
        },
        { $sort: { totalSales: -1 } },
        {
          $group: {
            _id: {
              region: "$_id.region",
              area: "$_id.area",
            },
            topCategories: {
              $push: {
                category: "$_id.category",
                totalSales: "$totalSales",
              },
            },
          },
        },
        {
          $project: {
            region: "$_id.region",
            area: "$_id.area",
            topCategories: { $slice: ["$topCategories", 3] },
            _id: 0,
          },
        },
      ]);

      // 🔹 Ensure area data isn't missing
      const processedSalesAnalysis = salesAnalysis.map((item) => {
        if (!item.area || item.area === "Unknown") {
          const regionData = regionSummary.find((r) => r.region === item.region);
          if (regionData && regionData.area) {
            item.area = regionData.area;
          }
        }
        return item;
      });

      console.log("✅ Aggregation complete:", processedSalesAnalysis.length, "records");
      console.log("📊 Sales Analysis:", salesAnalysis);
      console.log("📍 Region Summary:", regionSummary);
      console.log("🔥 Top Categories:", topCategoriesByRegion);

      res.status(200).json({
        success: true,
        salesAnalysis: processedSalesAnalysis,
        regionSummary,
        topCategoriesByRegion,
      });
    } catch (error) {
      console.error("❌ Error in category-region-analysis:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

// 🔹 Get workshop recommendations based on sales data
router.get(
  "/workshop-recommendation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { category } = req.query;

      let matchStage = {};
      if (category && category !== "All") {
        matchStage = { "cart.category": category };
      }

      const recommendationData = await Order.aggregate([
        { $unwind: "$cart" },
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: {
              region: "$cart.shop.region",
              area: "$cart.shop.area",
            },
            totalSales: {
              $sum: {
                $multiply: [
                  "$cart.qty",
                  { 
                    $cond: {
                      if: { $gt: ["$cart.discountPrice", 0] },
                      then: "$cart.discountPrice",
                      else: {
                        $cond: {
                          if: { $gt: ["$cart.originalPrice", 0] },
                          then: "$cart.originalPrice",
                          else: "$cart.price"
                        }
                      }
                    }
                  }
                ],
              },
            },
            totalQuantity: { $sum: "$cart.qty" },
            orderCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            region: "$_id.region",
            area: "$_id.area",
            totalSales: 1,
            totalQuantity: 1,
            orderCount: 1,
          },
        },
        { $sort: { totalSales: -1 } },
        { $limit: 5 },
      ]);

      res.status(200).json({
        success: true,
        recommendationData,
      });
    } catch (error) {
      console.error("❌ Error in workshop-recommendation:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

module.exports = router;