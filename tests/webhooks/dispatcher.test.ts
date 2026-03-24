import { describe, it, expect, vi, beforeEach } from "vitest";

describe("fireJobCompletedWebhook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when WEBHOOK_URL is not set", async () => {
    delete process.env.WEBHOOK_URL;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { fireJobCompletedWebhook } = await import(
      "@/lib/webhooks/dispatcher"
    );
    await fireJobCompletedWebhook("job-123", {
      status: "complete",
      clipCount: 5,
      textOutputCount: 8,
      sourceTitle: "Test",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("sends webhook when URL is configured", async () => {
    process.env.WEBHOOK_URL = "https://hooks.example.com/test";
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
    });
    vi.stubGlobal("fetch", fetchSpy);

    // Force re-import to pick up new env
    vi.resetModules();
    const { fireJobCompletedWebhook } = await import(
      "@/lib/webhooks/dispatcher"
    );
    await fireJobCompletedWebhook("job-456", {
      status: "complete",
      clipCount: 10,
      textOutputCount: 5,
      sourceTitle: "My Video",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hooks.example.com/test");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body as string);
    expect(body.event).toBe("job.completed");
    expect(body.data.jobId).toBe("job-456");
    expect(body.data.clipCount).toBe(10);
    expect(body.timestamp).toBeDefined();

    delete process.env.WEBHOOK_URL;
    vi.unstubAllGlobals();
  });
});
