import { z } from "zod";

export const TOPIC_KEYS = [
  "animeCosplay",
  "art",
  "technology",
  "businessFinance",
  "collectiblesHobbies",
  "educationCareer",
  "fashionBeauty",
  "foodDrinks",
  "games",
  "health",
  "homeGarden",
  "humanitiesLaw",
  "identityRelationships",
  "internetCulture",
  "moviesTv",
  "music",
  "natureOutdoors",
  "newsPolitics",
  "placesTravel",
  "popCulture",
  "qasStories",
  "readingWriting",
  "sciences",
  "spooky",
  "sports",
  "vehicles",
  "wellness",
  "adultContent",
  "matureTopics",
] as const;

export const createCommunitySchema = z.object({
  name: z
    .string({ required_error: "Community name is required" })
    .min(2, "Name must be between 2 and 32 characters")
    .max(32, "Name must be between 2 and 32 characters")
    .regex(/^[a-zA-Z]+$/, "Community name can only contain latin letters"),
  displayName: z.string().max(64).optional(),
  description: z
    .string({ required_error: "Description is required" })
    .min(1, "Description is required")
    .max(1024, "Description cannot exceed 1024 characters"),
  topic: z.enum(TOPIC_KEYS, {
    errorMap: () => ({ message: "Please select a valid topic" }),
  }),
  isPrivate: z.boolean().optional().default(false),
  rulesAgreement: z
    .boolean()
    .refine((val) => val === true, "You must agree to the community rules"),
});

export const getCommunityParamsSchema = z.object({
  name: z.string().min(1),
});

export const listCommunitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  topic: z.enum(TOPIC_KEYS).optional(),
  search: z.string().optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type ListCommunitiesQuery = z.infer<typeof listCommunitiesQuerySchema>;
