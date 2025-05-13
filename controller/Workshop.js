const express = require("express");
const router = express.Router();

// Import models
const Workshop = require('../model/workshops');
const UserWorkshop = require('../model/userworkshop');
const Quiz = require('../model/quiz');
const QuizAttempt = require('../model/quizAttempt');
const Certificate = require('../model/certificate');

// Import middleware and utils
const ErrorHandler = require("../utils/ErrorHandler");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { v4: uuidv4 } = require('uuid');

//======================================================================
// HELPER FUNCTIONS
//======================================================================

/**
 * Extracts YouTube video ID from different URL formats
 * @param {string} url - YouTube URL in various formats
 * @returns {string|null} - YouTube video ID or null if not found
 */
function getVideoId(url) {
  if (!url) return null;
  
  // Handle different YouTube URL formats
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    // Embed URLs
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    // Short URLs
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
    // Share URLs with additional parameters
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([^&]+)/,
    // Mobile share URLs 
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([^&]+)/,
    // Share URLs that include other query parameters first
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(.*&)?v=([^&]+)/,
    // YouTube short URLs (youtu.be) with additional parameters
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)\?/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      // The last captured group is the video ID
      const groupIndex = pattern.toString().includes(".*&)?v=") ? 2 : 1;
      return match[groupIndex];
    }
  }
    // If no recognized format, try extracting the video ID from a YouTube URL
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        // Try to extract from query parameters
        if (urlObj.searchParams.has('v')) {
          return urlObj.searchParams.get('v');
        }
        
        // Try to extract from path (for youtu.be URLs)
        if (urlObj.hostname.includes('youtu.be')) {
          const path = urlObj.pathname.split('/');
          return path[path.length - 1];
        }
      }
    } catch (error) {
      // If URL parsing fails, continue with the fallback
    }
    
}
/**
 * Calculates overall progress from video progress map
 * @param {Map|Object} videoProgress - Progress of individual videos
 * @returns {number} - Overall progress percentage
 */
const calculateOverallProgress = (videoProgress) => {
  const progressMap = videoProgress instanceof Map 
    ? videoProgress 
    : new Map(Object.entries(videoProgress || {}));
  
  const values = [...progressMap.values()];
  return values.length > 0 
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) 
    : 0;
};

/**
 * Initiates certificate generation for a user who passed a workshop
 * @param {string} userId - User ID
 * @param {string} workshopId - Workshop ID
 */
const initiateCertificateGeneration = async (userId, workshopId) => {
  try {
    const certificateId = `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    await Certificate.create({
      certificateId,
      userId,
      workshopId,
      issuedAt: new Date(),
      verificationUrl: `${process.env.FRONTEND_URL}/verify/${certificateId}`
    });

    await UserWorkshop.findOneAndUpdate(
      { userId, workshopId },
      { 
        certified: true,
        certificationDate: new Date(),
        certificateId 
      }
    );
  } catch (err) {
    console.error("Certificate generation failed:", err);
  }
};
// Define getWorkshopQuiz controller function
const getWorkshopQuiz = catchAsyncErrors(async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ workshopId: req.params.id });
    if (!quiz) {
      return next(new ErrorHandler("Quiz not found", 404));
    }
    
    res.status(200).json({
      success: true,
      quiz
    });
  } catch (err) {
    return next(new ErrorHandler(err.message, 500));
  }
});


/**
 * Retrieves quiz for a workshop
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


//======================================================================
// WORKSHOP MANAGEMENT ROUTES (ADMIN)
//======================================================================

/**
 * Create a new workshop with videos and optional quiz
 * POST /create-workshop
 */
router.post(
  "/create-workshop",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { 
        name, category, description, videos, totalDuration, 
        requirements, level, quiz 
      } = req.body;

      // Process videos and add thumbnails
      const processedVideos = videos.map((video, index) => {
        const videoId = getVideoId(video.youtubeUrl);
        return {
          ...video,
          order: index + 1,
          thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null
        };
      });

      // Create workshop
      const workshop = await Workshop.create({
        name,
        category,
        description,
        videos: processedVideos,
        totalDuration,
        requirements,
        level
      });

      // Create associated quiz if provided
      if (quiz) {
        const newQuiz = await Quiz.create({
          ...quiz,
          workshopId: workshop._id
        });
        
        // Add quiz reference to response
        workshop.quiz = newQuiz;
      }

      res.status(201).json({
        success: true,
        workshop,
      });
    } catch (err) {
      return next(new ErrorHandler(err.message, 500));
    }
  })
);

/**


/**
 * Delete a workshop
 * DELETE /delete-workshop/:id
 */
router.delete(
  "/delete-workshop/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const workshop = await Workshop.findById(req.params.id);
      if (!workshop) {
        return next(new ErrorHandler("Workshop not found", 404));
      }
      await Workshop.findByIdAndDelete(req.params.id);
      res.status(200).json({
        success: true,
        message: "Workshop deleted successfully",
      });
    } catch (err) {
      return next(new ErrorHandler(err.message, 500));
    }
  })
);

//======================================================================
// PUBLIC WORKSHOP ROUTES
//======================================================================

/**
 * Get all workshops with optional search and filtering
 * GET /all-workshops
 */
router.get("/all-workshops", catchAsyncErrors(async (req, res, next) => {
  try {
    const { search, level } = req.query;
    const query = {};

    // Apply filters if provided
    if (level) {
      query.level = level;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const workshops = await Workshop.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      workshops,
    });
  } catch (err) {
    return next(new ErrorHandler(err.message, 500));
  }
}));

/**
 * Get details of a specific workshop
 * GET /workshop/:id
 */
router.get("/workshop/:id", catchAsyncErrors(async (req, res, next) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return next(new ErrorHandler("Workshop not found", 404));
    }
    res.status(200).json({
      success: true,
      workshop,
    });
  } catch (err) {
    return next(new ErrorHandler(err.message, 500));
  }
}));
// Add new quiz routes
router.get(
  "/workshop/:workshopId/quiz",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const quiz = await Quiz.findOne({ workshopId: req.params.workshopId });
      if (!quiz) {
        return next(new ErrorHandler("Quiz not found", 404));
      }
      res.status(200).json({
        success: true,
        quiz,
      });
    } catch (err) {
      return next(new ErrorHandler(err.message, 500));
    }
  })
);


router.get(
  "/:workshopId/quiz",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { workshopId } = req.params;
      const userId = req.user._id;

      // Check if already passed
      const passedAttempt = await QuizAttempt.findOne({
        userId,
        workshopId,
        passed: true
      });

      if (passedAttempt) {
        const quiz = await Quiz.findOne({ workshopId });
        return res.status(200).json({
          success: true,
          quiz,
          alreadyPassed: true
        });
      }

      // Return quiz
      const quiz = await Quiz.findOne({ workshopId });
      if (!quiz) {
        return next(new ErrorHandler("Quiz not found", 404));
      }

      res.status(200).json({
        success: true,
        quiz
      });

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
// Enhanced quiz endpoint

//======================================================================
// USER PROGRESS TRACKING ROUTES
//======================================================================

/**
 * Track user's progress in a workshop
 * POST /track-progress
 */
router.post(
  "/track-progress",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { 
        workshopId, 
        userId, 
        videoProgress, 
        totalProgress, 
        completed, 
        lastVideoIndex,
        lastVideoTime
      } = req.body;

      // Security check: User can only update their own progress
      if (req.user._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own progress"
        });
      }

         // Find workshop to get video count
      const workshop = await Workshop.findById(workshopId);
      if (!workshop) {
        return res.status(404).json({
          success: false,
          message: "Workshop not found"
        });
      }
      // Find or create user workshop progress
      let userWorkshop = await UserWorkshop.findOne({ userId, workshopId });
      
      if (!userWorkshop) {
        // Create new progress record
        userWorkshop = new UserWorkshop({
          userId,
          workshopId,
          videoProgress: new Map(Object.entries(videoProgress)),
          totalProgress,
          completed: false,
          lastVideoIndex,
          lastVideoTime
        });
      } else {
        // Update existing progress record, keeping highest values
        const existingProgress = userWorkshop.videoProgress;
        Object.entries(videoProgress).forEach(([videoIndex, progress]) => {
          const existingValue = existingProgress.get(videoIndex) || 0;
          existingProgress.set(videoIndex, Math.max(existingValue, progress));
        });
        
        userWorkshop.totalProgress = Math.max(userWorkshop.totalProgress || 0, totalProgress);
        userWorkshop.lastWatched = new Date();
        
        // Update last video position if provided
        if (lastVideoIndex !== undefined) {
          userWorkshop.lastVideoIndex = lastVideoIndex;
        }
        if (lastVideoTime !== undefined) {
          userWorkshop.lastVideoTime = lastVideoTime;
        }
      }

       const COMPLETION_THRESHOLD = 85; // Must match client-side constant
      const videoCount = workshop.videos.length;
      let allVideosCompleted = true;
      
      // Check if all videos meet the threshold
      for (let i = 0; i < videoCount; i++) {
        const progress = userWorkshop.videoProgress.get(i.toString()) || 0;
        if (progress < COMPLETION_THRESHOLD) {
          allVideosCompleted = false;
          break;
        }
      }
      
      // Only mark as completed if ALL videos meet the threshold
      userWorkshop.completed = allVideosCompleted;


      await userWorkshop.save();

       res.status(200).json({
        success: true,
        userWorkshop: {
          ...userWorkshop.toObject(),
          videoProgress: Object.fromEntries(userWorkshop.videoProgress),
          completed: userWorkshop.completed
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  })
);

/**
 * Get user's progress for a specific workshop
 * GET /user-progress/:workshopId/:userId
 */
router.get(
  "/user-progress/:workshopId/:userId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { workshopId, userId } = req.params;

      // Security check: User can only view their own progress
      if (req.user._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own progress"
        });
      }

      const userWorkshop = await UserWorkshop.findOne({ 
        userId, 
        workshopId 
      });

      res.status(200).json({
        success: true,
        userWorkshop
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  })
);

/**
 * Get all workshops the user has interacted with
 * GET /user-workshops
 */
router.get(
  "/user-workshops",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Find all user workshop records and populate workshop details
      const userWorkshops = await UserWorkshop.find({ userId: req.user._id })
        .populate('workshopId')
        .sort({ lastWatched: -1 });
  
      // Process workshop data for frontend
      const workshops = await Promise.all(userWorkshops
        .filter(uw => uw.workshopId) // Filter out any null references
        .map(async (uw) => {
          const workshop = uw.workshopId.toObject();
          
          // Convert Map to object if it's a Map
          const videoProgress = uw.videoProgress instanceof Map 
            ? Object.fromEntries(uw.videoProgress) 
            : uw.videoProgress || {};

          // Use the actual totalProgress from the database
          const calculatedProgress = uw.totalProgress || 0;
  
          return {
            ...workshop,
            videoProgress,
            progress: calculatedProgress,
            completed: uw.completed,
            lastWatched: uw.lastWatched
          };
        }));
  
      res.status(200).json({
        success: true,
        workshops
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//======================================================================
// QUIZ AND CERTIFICATE ROUTES
//======================================================================

/**
 * Get quiz for a specific workshop
 * GET /:workshopId/quiz
 */
router.get(
  "/:workshopId/quiz",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { workshopId } = req.params;
      const userId = req.user._id;

      // Check if user already passed the quiz
      const passedAttempt = await QuizAttempt.findOne({
        userId,
        workshopId,
        passed: true
      });

      if (passedAttempt) {
        const quiz = await Quiz.findOne({ workshopId });
        return res.status(200).json({
          success: true,
          quiz,
          alreadyPassed: true
        });
      }

      // Return quiz for the user to attempt
      const quiz = await Quiz.findOne({ workshopId });
      if (!quiz) {
        return next(new ErrorHandler("Quiz not found", 404));
      }

      res.status(200).json({
        success: true,
        quiz
      });

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

/**
 * Submit a quiz attempt
 * POST /submit-quiz
 */
router.post(
  "/submit-quiz",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { workshopId, quizId, answers, score, passed } = req.body;
      const userId = req.user._id;

      // 1. Validate input
      if (!workshopId || !quizId || !answers) {
        return next(new ErrorHandler("Missing required fields", 400));
      }

      // 2. Check for existing passed attempts
      const existingAttempt = await QuizAttempt.findOne({
        userId,
        workshopId,
        passed: true
      });

      if (existingAttempt) {
        return res.status(200).json({
          success: true,
          alreadyPassed: true,
          previousScore: existingAttempt.score
        });
      }

      // 3. Ensure UserWorkshop exists
      await UserWorkshop.findOneAndUpdate(
        { userId, workshopId },
        { 
          $setOnInsert: {
            userId,
            workshopId,
            videoProgress: new Map(),
            totalProgress: 0
          }
        },
        { upsert: true }
      );

      // 4. Create quiz attempt
      const attemptNumber = await QuizAttempt.countDocuments({ userId, workshopId }) + 1;
      
      const quizAttempt = await QuizAttempt.create({
        userId,
        workshopId,
        quizId,
        answers,
        score,
        passed,
        attemptNumber,
        attemptedAt: new Date(),
        details: {
          totalQuestions: answers.length,
          correctAnswers: answers.filter(a => a.isCorrect).length
        }
      });

      // 5. Update workshop completion if passed
      if (passed) {
        await UserWorkshop.findOneAndUpdate(
          { userId, workshopId },
          { 
            $set: { 
              quizCompleted: true,
              lastUpdated: new Date(),
              ...(score >= 80 ? { completed: true } : {}) // Only mark fully completed if score threshold met
            }
          }
        );

        // Initiate certificate generation if requirements met
        const workshop = await Workshop.findById(workshopId);
        if (workshop?.autoCertify && score >= workshop.passingScore) {
          await initiateCertificateGeneration(userId, workshopId);
        }
      }

      res.status(200).json({
        success: true,
        quizAttempt,
        passed,
        attemptNumber,
        canRetry: !passed && attemptNumber < 3 // Example: Allow up to 3 attempts
      });

    } catch (error) {
      console.error("Quiz submission error:", error);
      next(new ErrorHandler("Quiz submission failed", 500));
    }
  })
);

/**
 * Get quiz attempts for a specific workshop
 * GET /quiz-attempts/:workshopId
 */
router.get(
  "/quiz-attempts/:workshopId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const attempts = await QuizAttempt.find({
        userId: req.user._id,
        workshopId: req.params.workshopId
      }).sort({ attemptedAt: -1 });

      // Check if user has passed
      const hasPassed = attempts.some(attempt => attempt.passed);

      res.status(200).json({
        success: true,
        attempts,
        hasPassed
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

/**
 * Generate certificate for completed workshop
 * GET /generate-certificate/:workshopId
 */
router.get(
  "/generate-certificate/:workshopId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { workshopId } = req.params;
      const userId = req.user._id;

      // Verify workshop completion
      const userWorkshop = await UserWorkshop.findOneAndUpdate(
        { userId: req.user._id, workshopId },
        { $setOnInsert: { 
          videoProgress: new Map(),
          completed: false 
        }},
        { upsert: true, new: true }
      );
      
      if (!userWorkshop?.completed) {
        return next(new ErrorHandler("Workshop not completed", 400));
      }

      // Get the most recent passed attempt
      const quizAttempt = await QuizAttempt.findOne({ 
        userId,
        workshopId,
        passed: true
      }).sort({ attemptedAt: -1 });

      if (!quizAttempt) {
        return next(new ErrorHandler("Quiz not passed", 400));
      }

      // Check for existing certificate
      let certificate = await Certificate.findOne({ 
        userId, 
        workshopId 
      });

      if (!certificate) {
        // Create new certificate
        const certificateId = `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
        
        certificate = await Certificate.create({
          certificateId,
          userId,
          workshopId,
          quizId: quizAttempt.quizId,
          score: quizAttempt.score,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-certificate/${certificateId}`,
          issuedAt: new Date()
        });

        // Update user workshop record
        userWorkshop.certificateId = certificateId;
        userWorkshop.certified = true;
        userWorkshop.certificationDate = new Date();
        await userWorkshop.save();
      }

      res.status(200).json({
        success: true,
        certificate,
        workshop: await Workshop.findById(workshopId),
        user: req.user
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

/**
 * Verify a certificate's authenticity
 * GET /verify-certificate/:certificateId
 */
router.get(
  "/verify-certificate/:certificateId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const certificate = await Certificate.findOne({ 
        certificateId: req.params.certificateId 
      })
      .populate('userId', 'name email')
      .populate('workshopId', 'name category');

      if (!certificate) {
        return next(new ErrorHandler("Certificate not found", 404));
      }

      res.status(200).json({
        success: true,
        certificate
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;