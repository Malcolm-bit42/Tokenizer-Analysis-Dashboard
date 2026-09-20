import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LiveWindow } from "./live_window";
import { getRandomSentence, tokeniseText } from "../../api/api";

// Mock the API layer so no real network calls happen.
vi.mock("../../api/api", () => ({
    getRandomSentence: vi.fn(),
    tokeniseText: vi.fn(),
}));

const TOKENIZERS = ["gpt2", "bert-base-uncased"];
const LANGUAGES = { eng_Latn: "English", afr_Latn: "Afrikaans" };

// Opens the (custom, search-style) tokenizer DropDown and picks an option.
function selectTokenizer(name: string) {
    const input = screen.getByPlaceholderText("Type to search...");
    fireEvent.focus(input);
    fireEvent.mouseDown(screen.getByText(name));
}

function getTextarea() {
    return screen.getByPlaceholderText(/Type or paste text/i) as HTMLTextAreaElement;
}

function setup(props: Partial<React.ComponentProps<typeof LiveWindow>> = {}, onAddTokenizer = vi.fn()) {
    render(
        <LiveWindow
            tokenizers={TOKENIZERS}
            loading={false}
            languages={LANGUAGES}
            onAddTokenizer={onAddTokenizer}
            {...props}
        />
    );
    return { onAddTokenizer };
}

describe("LiveWindow — Tokenize Preview box", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ───────────────────────── Feature: Tokenizer selection ─────────────────────────
    describe("Feature: tokenizer selection", () => {
        test("no tokenizer is pre-selected by default", () => {
            setup();
            const input = screen.getByPlaceholderText("Type to search...") as HTMLInputElement;
            expect(input.value).toBe("");
            expect(tokeniseText).not.toHaveBeenCalled();
        });

        test("picking a tokenizer registers it with the parent via onAddTokenizer", () => {
            const { onAddTokenizer } = setup();
            selectTokenizer("gpt2");
            expect(onAddTokenizer).toHaveBeenCalledWith("gpt2");
        });
    });

    // ───────────────────────── Feature: text input ─────────────────────────
    describe("Feature: text input", () => {
        test("shows a placeholder message when there is no text yet", () => {
            setup();
            expect(screen.getByText("Enter some text above to see its tokens.")).toBeInTheDocument();
        });

        test("character count updates live as the user types", () => {
            setup();
            fireEvent.change(getTextarea(), { target: { value: "hello" } });
            expect(screen.getByText("5 characters")).toBeInTheDocument();

            fireEvent.change(getTextarea(), { target: { value: "hello world" } });
            expect(screen.getByText("11 characters")).toBeInTheDocument();
        });

        // Known limitation: the character count is `previewText.length`, which
        // counts UTF-16 code units, not visible characters. An emoji like 😀 is
        // a surrogate pair, so it reports as 2 characters instead of 1. This
        // test documents that gap and is expected to fail until it's fixed.
        test.fails("counts a single emoji as one character", () => {
            setup();
            fireEvent.change(getTextarea(), { target: { value: "😀" } });
            expect(screen.getByText("1 characters")).toBeInTheDocument();
        });

        test("clearing the text removes any existing preview result", async () => {
            (tokeniseText as any).mockResolvedValue({
                model_id: "gpt2",
                tokens: ["hel", "lo"],
                token_ids: [1, 2],
                offsets: [[0, 3], [3, 5]],
                metrics: { fertility: 1.5, compression: 2.2, token_count: 2 },
            });
            setup();
            selectTokenizer("gpt2");
            fireEvent.change(getTextarea(), { target: { value: "hello" } });
            await screen.findByText("hel");

            fireEvent.change(getTextarea(), { target: { value: "" } });
            await waitFor(() =>
                expect(screen.getByText("Enter some text above to see its tokens.")).toBeInTheDocument()
            );
        });
    });

    // ───────────────────────── Feature: debounced tokenization ─────────────────────────
    describe("Feature: live tokenization", () => {
        test("fires the tokenize call only once both a tokenizer and text are set", async () => {
            (tokeniseText as any).mockResolvedValue({
                model_id: "gpt2",
                tokens: ["hel", "lo"],
                token_ids: [1, 2],
                offsets: [[0, 3], [3, 5]],
                metrics: { fertility: 1.5, compression: 2.2, token_count: 2 },
            });

            setup();
            selectTokenizer("gpt2");
            fireEvent.change(getTextarea(), { target: { value: "hello" } });

            await waitFor(
                () => expect(tokeniseText).toHaveBeenCalledWith("gpt2", "hello"),
                { timeout: 2000 }
            );
        });

        test("shows a loading skeleton while the tokenize call is in flight", async () => {
            let resolveCall!: (v: any) => void;
            (tokeniseText as any).mockImplementation(
                () => new Promise((res) => { resolveCall = res; })
            );

            setup();
            selectTokenizer("gpt2");
            fireEvent.change(getTextarea(), { target: { value: "hello" } });

            await waitFor(() => expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(0), {
                timeout: 2000,
            });

            resolveCall({
                model_id: "gpt2",
                tokens: ["hel", "lo"],
                token_ids: [1, 2],
                offsets: [[0, 3], [3, 5]],
                metrics: { fertility: 1.5, compression: 2.2, token_count: 2 },
            });

            await waitFor(() => expect(document.querySelectorAll(".skeleton").length).toBe(0));
        });

        test("renders live fertility and compression for the current sample", async () => {
            (tokeniseText as any).mockResolvedValue({
                model_id: "gpt2",
                tokens: ["hel", "lo"],
                token_ids: [1, 2],
                offsets: [[0, 3], [3, 5]],
                metrics: { fertility: 1.5, compression: 2.2, token_count: 2 },
            });

            setup();
            selectTokenizer("gpt2");
            fireEvent.change(getTextarea(), { target: { value: "hello" } });

            await waitFor(() => {
                expect(screen.getByText("1.500")).toBeInTheDocument(); // fertility
                expect(screen.getByText("2.200")).toBeInTheDocument(); // compression
            }, { timeout: 2000 });
        });

        test("shows an error message when tokenization fails", async () => {
            (tokeniseText as any).mockRejectedValue(new Error("Backend exploded"));

            setup();
            selectTokenizer("gpt2");
            fireEvent.change(getTextarea(), { target: { value: "hello" } });

            await waitFor(
                () => expect(screen.getByText("Backend exploded")).toBeInTheDocument(),
                { timeout: 2000 }
            );
        });
    });

    // ───────────────────────── Feature: random sentence generator ─────────────────────────
    describe("Feature: random sentence generator", () => {
        test("the language selector is disabled while the page's option lists are loading", () => {
            setup({ loading: true });
            expect(screen.getByRole("combobox", { name: /Language for random sentence/i })).toBeDisabled();
        });

        test("fetches and fills in a sentence for the selected language", async () => {
            (getRandomSentence as any).mockResolvedValue({ text: "Le chat noir.", language: "French" });
            setup();

            const button = await screen.findByRole("button", { name: /Random sentence/i });
            fireEvent.click(button);

            await waitFor(() => expect(getRandomSentence).toHaveBeenCalledWith("English"));
            await waitFor(() => expect(getTextarea().value).toBe("Le chat noir."));
        });

        test("shows an error message if the request fails", async () => {
            (getRandomSentence as any).mockRejectedValue(new Error("No sentence available"));
            setup();

            fireEvent.click(screen.getByRole("button", { name: /Random sentence/i }));

            await waitFor(() =>
                expect(screen.getByText("No sentence available")).toBeInTheDocument()
            );
        });
    });

    // ───────────────────────── Feature: file upload ─────────────────────────
    describe("Feature: file upload", () => {
        function getFileInput() {
            return document.querySelector('input[type="file"]') as HTMLInputElement;
        }

        test("loads the contents of a valid .txt file into the text box", async () => {
            setup();
            const file = new File(["Hello from file"], "sample.txt", { type: "text/plain" });
            fireEvent.change(getFileInput(), { target: { files: [file] } });

            await waitFor(() => expect(screen.getByText(/📄 sample\.txt/)).toBeInTheDocument());
            await waitFor(() => expect(getTextarea().value).toBe("Hello from file"));
        });

        test("rejects a non-.txt file", async () => {
            setup();
            const file = new File(["binary"], "sample.pdf", { type: "application/pdf" });
            fireEvent.change(getFileInput(), { target: { files: [file] } });

            expect(await screen.findByText("Only .txt files are supported.")).toBeInTheDocument();
            expect(getTextarea().value).toBe("");
        });

        test("rejects a .txt file over the 3MB limit", async () => {
            setup();
            const bigContent = "a".repeat(3 * 1024 * 1024 + 10);
            const file = new File([bigContent], "big.txt", { type: "text/plain" });
            fireEvent.change(getFileInput(), { target: { files: [file] } });

            expect(await screen.findByText(/File is too large/)).toBeInTheDocument();
        });

        test("typing after an upload clears the shown filename", async () => {
            setup();
            const file = new File(["Hello from file"], "sample.txt", { type: "text/plain" });
            fireEvent.change(getFileInput(), { target: { files: [file] } });
            await screen.findByText(/📄 sample\.txt/);

            fireEvent.change(getTextarea(), { target: { value: "Hello from file!" } });
            expect(screen.queryByText(/📄 sample\.txt/)).not.toBeInTheDocument();
        });
    });

    // ───────────────────────── Feature: clear ─────────────────────────
    describe("Feature: clear", () => {
        test("resets the text box content", () => {
            setup();
            fireEvent.change(getTextarea(), { target: { value: "some text" } });
            expect(getTextarea().value).toBe("some text");

            fireEvent.click(screen.getByRole("button", { name: /Clear/i }));
            expect(getTextarea().value).toBe("");
        });

        test("also clears an upload error and filename", async () => {
            setup();
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            const badFile = new File(["binary"], "sample.pdf", { type: "application/pdf" });
            fireEvent.change(fileInput, { target: { files: [badFile] } });
            await screen.findByText("Only .txt files are supported.");

            fireEvent.change(getTextarea(), { target: { value: "text" } });
            fireEvent.click(screen.getByRole("button", { name: /Clear/i }));

            expect(screen.queryByText("Only .txt files are supported.")).not.toBeInTheDocument();
        });
    });
});