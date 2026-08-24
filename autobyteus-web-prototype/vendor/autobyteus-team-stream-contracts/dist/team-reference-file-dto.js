import { z } from "zod";
import { nonEmptyStringSchema } from "./schema-helpers.js";
export const teamReferenceFileDtoSchema = z.object({
    reference_id: nonEmptyStringSchema,
    path: nonEmptyStringSchema,
    type: z.enum(["file", "image", "audio", "video", "pdf", "csv", "excel", "other"]),
    created_at: nonEmptyStringSchema,
    updated_at: nonEmptyStringSchema,
}).strict();
//# sourceMappingURL=team-reference-file-dto.js.map