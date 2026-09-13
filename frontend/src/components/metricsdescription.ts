/**
 * Plain-language descriptions for each metric, shown in the MetricInfo
 * popover. Keep keys lowercase/snake_case and matching the metric's
 * underlying field name so it's easy to look up from anywhere.
 *
 * If a future page introduces a metric not listed here, just add it —
 * this file is the single source of truth, no need to redefine strings
 * per page.
 */
export const METRIC_INFO: Record<string, string> = {
    fertility:
        "Average number of tokens produced per word. Lower is more efficient — a value close to 1 means the tokenizer mostly keeps whole words intact instead of splitting them up.",
    compression:
        "How many characters of the original text are packed into each token, on average. Higher means the tokenizer fits more text into fewer tokens.",
    token_count:
        "The total number of tokens the tokenizer produced for this sample of text.",
    token_premium:
        "How many more tokens this tokenizer needs, on average, compared to the most efficient tokenizer in the comparison — a rough 'cost penalty' for choosing this tokenizer.",
    precision:
        "Of all the token boundaries the tokenizer chose, the share that line up with real word or morpheme boundaries in the language.",
    recall:
        "Of all the real word or morpheme boundaries in the language, the share the tokenizer actually found.",
    f1:
        "The balance between precision and recall — a single score that rewards tokenizers which are both accurate and thorough at finding real word boundaries.",
};