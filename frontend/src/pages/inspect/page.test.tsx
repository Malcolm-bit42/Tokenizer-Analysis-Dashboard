import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Inspect from "./page";
import {
    getLanguages,
    getTokenizers,
    getMetrics,
    tokeniseText,
    getRandomSentence,
} from "../../api/api";

// Mock the whole API layer — the Inspect page and its embedded LiveWindow
// both import from here, so one mock covers everything on the page.
vi.mock("../../api/api", () => ({
    getLanguages: vi.fn(),
    getTokenizers: vi.fn(),
    getMetrics: vi.fn(),
    tokeniseText: vi.fn(),
    getRandomSentence: vi.fn(),
}));

const TOKENIZERS = ["gpt2", "bert-base-uncased"];
const LANGUAGES = { eng_Latn: "English", afr_Latn: "Afrikaans" };

const METRICS = {
    model_id: "gpt2",
    efficiency: {
        English: { fertility: 1.5, compression: 2.2, token_count: 10, token_premium: 1.05 },
        Afrikaans: { fertility: 1.8, compression: 1.9, token_count: 14, token_premium: 1.4 },
    },
    linguistic: {
        English: { precision: 0.8, recall: 0.7, f1: 0.75 },
        Afrikaans: { precision: 0.6, recall: 0.5, f1: 0.55 },
    },
};

// Opens the *main* (page-level) tokenizer DropDown and picks an option.
// It's the first "Type to search..." input in DOM order — the embedded
// LiveWindow further down the page renders its own, separate copy.
function selectMainTokenizer(name: string) {
    const input = screen.getAllByPlaceholderText("Type to search...")[0];
    fireEvent.focus(input);
    fireEvent.mouseDown(screen.getByText(name));
}

function typeNewMainTokenizer(name: string) {
    const input = screen.getAllByPlaceholderText("Type to search...")[0];
    fireEvent.change(input, { target: { value: name } });
    fireEvent.keyDown(input, { key: "Enter" });
}

// Renders with metrics for only a single language, so per-language assertions
// (colour, "no metrics" state, etc.) aren't ambiguous between English/Afrikaans.
async function renderWithOnlyEnglishSelected() {
    render(<Inspect />);
    const afrikaans = await screen.findByRole("button", { name: "Afrikaans" });
    fireEvent.click(afrikaans); // leaves only English selected
    await waitFor(() => expect(getMetrics).toHaveBeenCalledWith("gpt2", ["English"], "all"));
}

describe("Inspect page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getTokenizers).mockResolvedValue(TOKENIZERS);
        vi.mocked(getLanguages).mockResolvedValue(LANGUAGES);
        vi.mocked(getMetrics).mockResolvedValue(METRICS as any);
    });

    // ───────────────────────── Feature: loading tokenizers & languages ─────────────────────────
    describe("Feature: loading tokenizers & languages", () => {
        test("shows skeleton loaders while the option lists are loading", async () => {
            let resolveTokenizers!: (v: string[]) => void;
            vi.mocked(getTokenizers).mockImplementation(
                () => new Promise((res) => { resolveTokenizers = res; })
            );

            render(<Inspect />);
            expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(0);

            resolveTokenizers(TOKENIZERS);
            await waitFor(() => expect(document.querySelectorAll(".skeleton").length).toBe(0));
        });

        test("loads tokenizers and languages from the backend exactly once", async () => {
            render(<Inspect />);

            await waitFor(() => {
                expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
                expect(screen.getByRole("button", { name: "Afrikaans" })).toBeInTheDocument();
            });

            expect(getTokenizers).toHaveBeenCalledTimes(1);
            expect(getLanguages).toHaveBeenCalledTimes(1);
        });

        test("shows an error message if loading tokenizers/languages fails", async () => {
            vi.mocked(getTokenizers).mockRejectedValue(new Error("Could not reach backend"));
            render(<Inspect />);
            expect(await screen.findByText("Could not reach backend")).toBeInTheDocument();
        });
    });

    // ───────────────────────── Feature: tokenizer selection ─────────────────────────
    describe("Feature: tokenizer selection", () => {
        test("defaults to the first tokenizer in the list", async () => {
            render(<Inspect />);
            await waitFor(() =>
                expect(getMetrics).toHaveBeenCalledWith("gpt2", ["English", "Afrikaans"], "all")
            );
        });

        test("picking a different tokenizer refetches metrics for it", async () => {
            render(<Inspect />);
            await waitFor(() =>
                expect(getMetrics).toHaveBeenCalledWith("gpt2", ["English", "Afrikaans"], "all")
            );

            selectMainTokenizer("bert-base-uncased");

            await waitFor(() =>
                expect(getMetrics).toHaveBeenCalledWith(
                    "bert-base-uncased",
                    ["English", "Afrikaans"],
                    "all"
                )
            );
        });

        test("typing a brand-new tokenizer id adds it and fetches its metrics", async () => {
            render(<Inspect />);
            await waitFor(() =>
                expect(getMetrics).toHaveBeenCalledWith("gpt2", ["English", "Afrikaans"], "all")
            );

            typeNewMainTokenizer("my-custom-tokenizer");

            await waitFor(() =>
                expect(getMetrics).toHaveBeenCalledWith(
                    "my-custom-tokenizer",
                    ["English", "Afrikaans"],
                    "all"
                )
            );
        });
    });

    // ───────────────────────── Feature: language selection ─────────────────────────
    describe("Feature: language selection", () => {
        test("defaults to all languages selected", async () => {
            render(<Inspect />);
            const english = await screen.findByRole("button", { name: "English" });
            const afrikaans = screen.getByRole("button", { name: "Afrikaans" });

            expect(english).toHaveClass("bg-charcoal");
            expect(afrikaans).toHaveClass("bg-charcoal");
        });

        test("toggling a language off refetches metrics without it", async () => {
            render(<Inspect />);
            const english = await screen.findByRole("button", { name: "English" });
            await waitFor(() =>
                expect(getMetrics).toHaveBeenCalledWith("gpt2", ["English", "Afrikaans"], "all")
            );

            fireEvent.click(english);

            expect(english).not.toHaveClass("bg-charcoal");
            await waitFor(() =>
                expect(getMetrics).toHaveBeenCalledWith("gpt2", ["Afrikaans"], "all")
            );
        });

        test("toggling a language back on re-adds it to the metrics request", async () => {
            render(<Inspect />);
            const english = await screen.findByRole("button", { name: "English" });
            await waitFor(() => expect(getMetrics).toHaveBeenCalledWith("gpt2", ["English", "Afrikaans"], "all"));

            fireEvent.click(english); // off
            await waitFor(() => expect(getMetrics).toHaveBeenCalledWith("gpt2", ["Afrikaans"], "all"));

            fireEvent.click(english); // back on
            await waitFor(() =>
                expect(getMetrics).toHaveBeenCalledWith("gpt2", ["Afrikaans", "English"], "all")
            );
        });

        test("shows a prompt instead of metrics once every language is deselected", async () => {
            render(<Inspect />);
            const english = await screen.findByRole("button", { name: "English" });
            const afrikaans = screen.getByRole("button", { name: "Afrikaans" });

            fireEvent.click(english);
            fireEvent.click(afrikaans);

            expect(
                await screen.findByText("Select a tokenizer and at least one language to see metrics.")
            ).toBeInTheDocument();
        });
    });

    // ───────────────────────── Feature: efficiency metrics ─────────────────────────
    describe("Feature: efficiency metrics", () => {
        test("renders fertility, compression and token count", async () => {
            render(<Inspect />);
            expect(await screen.findByText("1.50")).toBeInTheDocument(); // English fertility
            expect(screen.getByText("2.20")).toBeInTheDocument(); // English compression
            expect(screen.getByText("10")).toBeInTheDocument(); // English token_count
        });

        test("renders the token premium value as an 'Nx' gauge reading", async () => {
            await renderWithOnlyEnglishSelected();
            expect(screen.getByText("1.05×")).toBeInTheDocument();
        });

        test("colours the premium gauge green when close to the 1.0x floor", async () => {
            await renderWithOnlyEnglishSelected(); // English premium = 1.05
            expect(screen.getByText("1.05×")).toHaveStyle({ color: "var(--color-good)" });
        });

        test("colours the premium gauge amber for a moderate premium", async () => {
            vi.mocked(getMetrics).mockResolvedValue({
                model_id: "gpt2",
                efficiency: { English: { ...METRICS.efficiency.English, token_premium: 1.6 } },
                linguistic: { English: METRICS.linguistic.English },
            } as any);
            await renderWithOnlyEnglishSelected();
            expect(screen.getByText("1.60×")).toHaveStyle({ color: "var(--color-warn)" });
        });

        test("colours the premium gauge red for a high premium", async () => {
            vi.mocked(getMetrics).mockResolvedValue({
                model_id: "gpt2",
                efficiency: { English: { ...METRICS.efficiency.English, token_premium: 2.5 } },
                linguistic: { English: METRICS.linguistic.English },
            } as any);
            await renderWithOnlyEnglishSelected();
            expect(screen.getByText("2.50×")).toHaveStyle({ color: "var(--color-bad)" });
        });
    });

    // ───────────────────────── Feature: linguistic metrics ─────────────────────────
    describe("Feature: linguistic metrics", () => {
        test("renders precision, recall and f1", async () => {
            render(<Inspect />);
            expect(await screen.findByText("0.800")).toBeInTheDocument(); // English precision
            expect(screen.getByText("0.700")).toBeInTheDocument(); // English recall
            expect(screen.getByText("0.750")).toBeInTheDocument(); // English f1
        });
    });

    // ───────────────────────── Feature: metrics error / empty states ─────────────────────────
    describe("Feature: metrics error & empty states", () => {
        test("shows a per-language empty state when no metrics exist for it", async () => {
            vi.mocked(getMetrics).mockResolvedValue({
                model_id: "gpt2",
                efficiency: { English: METRICS.efficiency.English },
                linguistic: { English: METRICS.linguistic.English },
            } as any);

            render(<Inspect />);
            expect(
                await screen.findByText("No metrics available for this language.")
            ).toBeInTheDocument();
        });

        test("shows an error message when fetching metrics fails", async () => {
            vi.mocked(getMetrics).mockRejectedValue(new Error("Metrics service unavailable"));
            render(<Inspect />);
            expect(await screen.findByText("Metrics service unavailable")).toBeInTheDocument();
        });
    });

    // ───────────────────────── Feature: embedded Tokenize Preview box ─────────────────────────
    describe("Feature: embedded Tokenize Preview box", () => {
        test("renders on the page without firing any preview API calls on mount", async () => {
            render(<Inspect />);
            await waitFor(() => expect(getTokenizers).toHaveBeenCalled());

            expect(screen.getByText("Tokenize Preview")).toBeInTheDocument();
            expect(tokeniseText).not.toHaveBeenCalled();
            expect(getRandomSentence).not.toHaveBeenCalled();
        });
    });
});