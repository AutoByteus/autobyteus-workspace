export type LessonMessageRole = "student" | "tutor" | "system";
export type LessonMessageKind = "prompt" | "follow_up" | "hint_request" | "lesson_response" | "lesson_hint" | "system";

export type LessonMessageRecord = {
  messageId: string;
  lessonId: string;
  role: LessonMessageRole;
  kind: LessonMessageKind;
  body: string;
  createdAt: string;
};
