import { z } from "zod";
export declare const teamReferenceFileDtoSchema: z.ZodObject<{
    reference_id: z.ZodString;
    path: z.ZodString;
    type: z.ZodEnum<{
        file: "file";
        image: "image";
        audio: "audio";
        video: "video";
        pdf: "pdf";
        csv: "csv";
        excel: "excel";
        other: "other";
    }>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strict>;
export type TeamReferenceFileDto = Readonly<z.infer<typeof teamReferenceFileDtoSchema>>;
//# sourceMappingURL=team-reference-file-dto.d.ts.map