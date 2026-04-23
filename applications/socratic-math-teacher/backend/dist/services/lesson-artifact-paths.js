const PATH_RULES = {
    "socratic-math/lesson-response.md": {
        path: "socratic-math/lesson-response.md",
        messageKind: "lesson_response",
        notificationTopic: "lesson.response_received",
    },
    "socratic-math/lesson-hint.md": {
        path: "socratic-math/lesson-hint.md",
        messageKind: "lesson_hint",
        notificationTopic: "lesson.hint_received",
    },
};
export const resolveLessonArtifactPathRule = (artifactPath) => {
    const normalizedPath = artifactPath.replace(/\\/g, "/").trim();
    const rule = PATH_RULES[normalizedPath];
    if (!rule) {
        throw new Error(`Unexpected Socratic Math Teacher artifact path '${artifactPath}'.`);
    }
    return rule;
};
