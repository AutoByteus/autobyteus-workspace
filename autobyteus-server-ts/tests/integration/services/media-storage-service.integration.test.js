import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { InvalidMediaCategoryError, InvalidMediaPathError, MediaFileNotFoundError, MediaStorageService, } from "../../../src/services/media-storage-service.js";
const downloadFileFromUrlMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/utils/download-utils.js", () => ({
    downloadFileFromUrl: downloadFileFromUrlMock,
}));
const TEST_REMOTE_URL = "https://example.com/remote_image.png";
const SIMPLE_DATA_URI = "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==";
describe("MediaStorageService integration", () => {
    let tempRoot;
    let service;
    beforeEach(() => {
        tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-storage-"));
        downloadFileFromUrlMock.mockReset();
        const config = {
            getAppDataDir: () => tempRoot,
            getBaseUrl: () => "http://testserver:8000",
        };
        service = new MediaStorageService(config);
    });
    afterEach(() => {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    });
    it("saves media from a remote URL", async () => {
        downloadFileFromUrlMock.mockImplementation(async (_url, destinationDir) => {
            const filePath = path.join(destinationDir, "remote_image.png");
            fs.mkdirSync(destinationDir, { recursive: true });
            fs.writeFileSync(filePath, "mock png data");
            return filePath;
        });
        const localUrl = await service.storeMediaAndGetUrl(TEST_REMOTE_URL, "remote_image");
        expect(localUrl.startsWith("http://testserver:8000/rest/files/images/")).toBe(true);
        expect(localUrl.endsWith(".png")).toBe(true);
        const filename = localUrl.split("/").pop();
        const savedFilePath = path.join(service.getMediaRoot(), "images", filename);
        expect(fs.existsSync(savedFilePath)).toBe(true);
    });
    it("propagates download failures and leaves no files", async () => {
        downloadFileFromUrlMock.mockRejectedValue(new Error("HTTP 404 Not Found"));
        await expect(service.storeMediaAndGetUrl(TEST_REMOTE_URL, "remote_image")).rejects.toThrow("HTTP 404");
        const imagesDir = path.join(service.getMediaRoot(), "images");
        const files = fs.readdirSync(imagesDir);
        expect(files).toHaveLength(0);
    });
    it("saves media from a data URI", async () => {
        const localUrl = await service.storeMediaAndGetUrl(SIMPLE_DATA_URI, "hello_text");
        expect(localUrl.startsWith("http://testserver:8000/rest/files/documents/")).toBe(true);
        expect(localUrl.endsWith(".txt")).toBe(true);
    });
    it("saves media from a local file path", async () => {
        const sourceFile = path.join(tempRoot, "source.txt");
        fs.writeFileSync(sourceFile, "Hello, world!");
        const localUrl = await service.storeMediaAndGetUrl(sourceFile, "source");
        expect(localUrl.startsWith("http://testserver:8000/rest/files/documents/")).toBe(true);
        expect(localUrl.endsWith(".txt")).toBe(true);
    });
    it("lists media files without category filter", async () => {
        const imagesDir = service.getStorageDirByCategory("images");
        const docsDir = service.getStorageDirByCategory("documents");
        const imageFile = path.join(imagesDir, "test_image.png");
        const docFile = path.join(docsDir, "test_doc.txt");
        fs.writeFileSync(imageFile, "fake image");
        fs.writeFileSync(docFile, "fake doc");
        fs.utimesSync(imageFile, new Date(1), new Date(1));
        fs.utimesSync(docFile, new Date(2), new Date(2));
        const result = await service.listMediaFiles(undefined, 1, 10);
        expect(result.pagination.totalFiles).toBe(2);
        expect(result.files).toHaveLength(2);
        expect(result.files[0]?.filename).toBe("test_doc.txt");
        expect(result.files[1]?.filename).toBe("test_image.png");
    });
    it("lists media files by category", async () => {
        const imagesDir = service.getStorageDirByCategory("images");
        const imageFile = path.join(imagesDir, "test_image.png");
        fs.writeFileSync(imageFile, "fake image");
        const result = await service.listMediaFiles("images", 1, 10);
        expect(result.pagination.totalFiles).toBe(1);
        expect(result.files).toHaveLength(1);
        expect(result.files[0]?.category).toBe("images");
        expect(result.files[0]?.filename).toBe("test_image.png");
        expect(result.files[0]?.url).toBe("http://testserver:8000/rest/files/images/test_image.png");
    });
    it("paginates media files", async () => {
        const imagesDir = service.getStorageDirByCategory("images");
        const docsDir = service.getStorageDirByCategory("documents");
        const imageFile = path.join(imagesDir, "test_image.png");
        const docFile = path.join(docsDir, "test_doc.txt");
        fs.writeFileSync(imageFile, "fake image");
        fs.writeFileSync(docFile, "fake doc");
        fs.utimesSync(imageFile, new Date(1), new Date(1));
        fs.utimesSync(docFile, new Date(2), new Date(2));
        const page1 = await service.listMediaFiles(undefined, 1, 1);
        const page2 = await service.listMediaFiles(undefined, 2, 1);
        expect(page1.pagination.totalFiles).toBe(2);
        expect(page1.pagination.totalPages).toBe(2);
        expect(page1.pagination.currentPage).toBe(1);
        expect(page1.files).toHaveLength(1);
        expect(page2.files).toHaveLength(1);
        expect(page1.files[0]?.filename).not.toBe(page2.files[0]?.filename);
    });
    it("deletes media files", () => {
        const imagesDir = service.getStorageDirByCategory("images");
        const imageFile = path.join(imagesDir, "test_image.png");
        fs.writeFileSync(imageFile, "fake image");
        service.deleteMediaFile("images", "test_image.png");
        expect(fs.existsSync(imageFile)).toBe(false);
    });
    it("throws for missing media files", () => {
        expect(() => service.deleteMediaFile("images", "missing.png")).toThrow(MediaFileNotFoundError);
    });
    it("throws for invalid categories", () => {
        expect(() => service.deleteMediaFile("aliens", "file.txt")).toThrow(InvalidMediaCategoryError);
    });
    it("throws for path traversal attempts", () => {
        expect(() => service.deleteMediaFile("images", "../../../etc/passwd")).toThrow(InvalidMediaPathError);
    });
});
