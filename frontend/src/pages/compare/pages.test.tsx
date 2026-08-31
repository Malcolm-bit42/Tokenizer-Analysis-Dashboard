import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Compare from "./page";
import {getLanguages,getTokenizers,tokeniseText,getMetrics} from "../../api/api";


// Mock the API functions
vi.mock("../../api/api", () => ({
    getLanguages: vi.fn(),
    getTokenizers: vi.fn(),
    tokeniseText: vi.fn(),
    getMetrics: vi.fn()
}));


describe("Compare Tokenizers", () => {

    beforeEach(() => {

        vi.clearAllMocks();

        // Fake tokenizer response
        vi.mocked(getTokenizers).mockResolvedValue([
            "tokenizer-one",
            "tokenizer-two"
        ]);

        // Fake language response
        vi.mocked(getLanguages).mockResolvedValue({
            eng_Latn: "English",
            afr_Latn: "Afrikaans"
        });

    });


    //Tests if the page renders
    test("renders Compare Tokenizers page", () => {

        render(<Compare />);
        expect(screen.getByText("Compare Tokenizers")).toBeInTheDocument();

    });


    // Tests if the tokenizer dropdowns and the language dropdown renders and have a length of 3
    test("renders tokenizer dropdowns", () => {

        render(<Compare />);
        const selects = screen.getAllByRole("combobox");
        expect(selects).toHaveLength(3);

    });


    // Tests if the tokeners are being loaded on the backend by the page checking if the it interacts with the api
    test("loads tokenizers from backend", async () => {

        render(<Compare />);

        await waitFor(() => {
            expect(
                screen.getAllByText("tokenizer-one").length
            ).toBeGreaterThan(0);

            expect(
                screen.getAllByText("tokenizer-two").length
            ).toBeGreaterThan(0);
        });

        expect(getTokenizers).toHaveBeenCalledTimes(1);
    });


    // TEST 4
    test("loads languages from backend", async () => {

        render(<Compare />);
        await waitFor(() => {

            expect(screen.getByText("English")).toBeInTheDocument();
            expect(screen.getByText("Afrikaans")).toBeInTheDocument()
        });
        expect(getLanguages).toHaveBeenCalledTimes(1);
    });


    // TEST 5
    test("user can select both tokenizers", async () => {

        (getTokenizers as any).mockResolvedValue([
            "tokenizer-one",
            "tokenizer-two"
        ]);

        (getLanguages as any).mockResolvedValue({
            eng: "English"
        });

        render(<Compare />);

        await waitFor(() => {
            expect(screen.getAllByText("tokenizer-one").length).toBeGreaterThan(0);
            expect(screen.getAllByText("tokenizer-two").length).toBeGreaterThan(0);
        });

        const selects = screen.getAllByRole("combobox");

        fireEvent.change(selects[0], {
            target: { value: "tokenizer-one" }
        });

        fireEvent.change(selects[1], {
            target: { value: "tokenizer-two" }
        });

        expect(selects[0]).toHaveValue("tokenizer-one");
        expect(selects[1]).toHaveValue("tokenizer-two");
    });

    // TEST 6
    test("user can select a language", async () => {

        render(<Compare />);

        const selects = screen.getAllByRole("combobox");

        const language = selects[2];

        await waitFor(() => {
            expect(
                screen.getByText("English")
            ).toBeInTheDocument();
        });

        fireEvent.change(language, {
            target: {
                value: "English"
            }
        });

        expect(language).toHaveValue("English");

    });


    // TEST 7
    test("does not submit without selecting tokenizer 1", async () => {

        render(<Compare />);

        const selects = screen.getAllByRole("combobox");

        // Select tokenizer 2
        fireEvent.change(selects[1], {
            target: {
                value: "tokenizer-two"
            }
        });

        // Select language
        await waitFor(() => {
            expect(
                screen.getByText("English")
            ).toBeInTheDocument();
        });

        fireEvent.change(selects[2], {
            target: {
                value: "English"
            }
        });

        fireEvent.click(
            screen.getByRole("button", {
                name: "Submit"
            })
        );

        expect(getMetrics).not.toHaveBeenCalled();
        expect(tokeniseText).not.toHaveBeenCalled();

    });


    // TEST 8
    test("uses default text when no text or file is provided", async () => {

            // Fake metrics returned by the backend
    (getMetrics as any).mockResolvedValue({
        model_id: "test",

        efficiency: {
            English: {
                fertility: 1.5,
                compression: 2.0,
                token_count: 10
            }
        },

        linguistic: {
            English: {
                precision: 0.8,
                recall: 0.7,
                f1: 0.75
            }
        }
    });

    // Fake tokenized text returned by the backend
    (tokeniseText as any).mockResolvedValue({
        tokens: ["This", "is", "a", "default", "sentence."]
    });

        render(<Compare />);

        const selects = screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(
                screen.getByText("English")
            ).toBeInTheDocument();
        });

        fireEvent.change(selects[0], {
            target: {
                value: "tokenizer-one"
            }
        });

        fireEvent.change(selects[1], {
            target: {
                value: "tokenizer-two"
            }
        });

        fireEvent.change(selects[2], {
            target: {
                value: "English"
            }
        });

        fireEvent.click(
            screen.getByRole("button", {
                name: "Submit"
            })
        );

        await waitFor(() => {

            expect(tokeniseText).toHaveBeenCalledWith(
                "tokenizer-one",
                "This is a default sentence."
            );

        });

    });


    // TEST 9
    test("accepts a text file", async () => {

        render(<Compare />);

        const fileInput =
            document.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

        const file = new File(
            ["Hello\nWorld"],
            "test.txt",
            {
                type: "text/plain"
            }
        );

        fireEvent.change(fileInput, {
            target: {
                files: [file]
            }
        });

        await waitFor(() => {

            expect(fileInput.files?.[0]).toBe(file);

        });

    });


    // TEST 10
    test("displays tokenized text returned by backend", async () => {

        (getMetrics as any).mockResolvedValue({
            model_id: "test",

            efficiency: {
                English: {
                    fertility: 1.5,
                    compression: 2.0,
                    token_count: 10
                }
            },

            linguistic: {
                English: {
                    precision: 0.8,
                    recall: 0.7,
                    f1: 0.75
                }
            }
        });
         (tokeniseText as any).mockResolvedValue({
            tokens: ["Hello", "world"]
        });


        render(<Compare />);

        const selects = screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(
                screen.getByText("English")
            ).toBeInTheDocument();
        });

        fireEvent.change(selects[0], {
            target: {
                value: "tokenizer-one"
            }
        });

        fireEvent.change(selects[1], {
            target: {
                value: "tokenizer-two"
            }
        });

        fireEvent.change(selects[2], {
            target: {
                value: "English"
            }
        });

        const input =
            screen.getByPlaceholderText("Enter text");

        fireEvent.change(input, {
            target: {
                value: "Hello world"
            }
        });

        fireEvent.click(
            screen.getByRole("button", {
                name: "Submit"
            })
        );

        await waitFor(() => {

            expect(
                screen.getAllByText("Hello")
            ).toHaveLength(2);

            expect(
                screen.getAllByText("world")
            ).toHaveLength(2);

        });

    });

});