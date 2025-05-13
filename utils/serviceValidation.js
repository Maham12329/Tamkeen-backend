// utils/serviceValidation.js
const Joi = require("joi");

const createServiceValidationSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    "string.empty": "Name is required.",
    "string.min": "Name should have at least 3 characters.",
    "string.max": "Name should not exceed 100 characters.",
  }),
  description: Joi.string().min(5).max(500).required().messages({
    "string.empty": "Description is required.",
    "string.min": "Description should have at least 5 characters.",
    "string.max": "Description should not exceed 500 characters.",
  }),
  location: Joi.string().required().messages({
    "string.empty": "Location is required.",
  }),
  contactInfo: Joi.string()
    .length(11)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.empty": "Contact info is required.",
      "string.length": "Contact info must be exactly 11 digits.",
      "string.pattern.base": "Contact info must only contain digits.",
    }),
  availability: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      startTime: Joi.string().required(),
      endTime: Joi.string().required(),
      available: Joi.boolean().required(),
    })
  ),
  shopId: Joi.string().required().messages({
    "string.empty": "Shop ID is required.",
  }),
});

const updateServiceValidationSchema = Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    description: Joi.string().min(5).max(500).optional(),
    location: Joi.string().optional(),
    contactInfo: Joi.string()
      .length(11)
      .pattern(/^[0-9]+$/)
      .optional()
      .messages({
        "string.length": "Contact info must be exactly 11 digits.",
        "string.pattern.base": "Contact info must only contain digits.",
      }),
    availability: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        startTime: Joi.string().optional(),
        endTime: Joi.string().optional(),
        available: Joi.boolean().optional(),
        _id: Joi.string().optional(), 
      })
    ),
    shopId: Joi.string().optional(),
  });
module.exports = { createServiceValidationSchema, updateServiceValidationSchema };
