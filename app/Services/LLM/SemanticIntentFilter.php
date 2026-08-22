<?php

namespace App\Services\LLM;

class SemanticIntentFilter
{
    protected array $brandTaxonomy = [
        'color', 'palette', 'typography', 'font', 'logo', 'brand', 'identity',
        'design', 'visual', 'moodboard', 'mood', 'style', 'theme', 'layout',
        'geometry', 'geometric', 'shape', 'mark', 'icon', 'wordmark', 'lockup',
        'hierarchy', 'contrast', 'harmony', 'composition', 'balance', 'grid',
        'spacing', 'kerning', 'leading', 'serif', 'sans', 'display', 'script',
        'rgb', 'cmyk', 'hex', 'swatch', 'tone', 'voice', 'messaging', 'strategy',
        'audience', 'market', 'positioning', 'values', 'mission', 'vision',
        'pillar', 'concept', 'direction', 'feedback', 'resonance', 'guideline',
        'handoff', 'token', 'asset', 'pattern', 'texture', 'export',
        'sketch', 'refine', 'bezier', 'vector', 'path', 'stroke', 'fill',
        'print', 'digital', 'web', 'mobile', 'packaging', 'stationery',
        'social', 'campaign', 'advertising', 'collateral', 'brandbook',
    ];

    protected array $stopWords = [
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
        'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about',
        'through', 'during', 'before', 'after', 'above', 'below', 'between',
        'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
        'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
        'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
        'only', 'same', 'so', 'than', 'too', 'very', 'just', 'because',
        'but', 'and', 'or', 'if', 'while', 'although', 'though',
    ];

    protected function filteredWords(string $prompt): array
    {
        $normalized = mb_strtolower($prompt);
        $normalized = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $normalized) ?? $prompt;
        $normalized = preg_replace('/\s+/', ' ', $normalized) ?? $prompt;
        $normalized = trim($normalized);

        if ($normalized === '') {
            return [];
        }

        $words = explode(' ', $normalized);

        return array_values(array_filter(
            $words,
            fn ($w) => !in_array($w, $this->stopWords, true) && mb_strlen($w) > 2,
        ));
    }

    protected function countHits(array $words): int
    {
        $hits = 0;
        foreach ($words as $word) {
            foreach ($this->brandTaxonomy as $term) {
                if (str_contains($word, $term) || str_contains($term, $word)) {
                    $hits++;
                    break;
                }
            }
        }
        return $hits;
    }

    public function score(string $prompt): int
    {
        $words = $this->filteredWords($prompt);

        if (empty($words)) {
            return 0;
        }

        $hits = $this->countHits($words);
        $score = (int) round(($hits / count($words)) * 100);

        return min(100, $score);
    }

    public function isRelevant(string $prompt, int $threshold = 30): bool
    {
        $words = $this->filteredWords($prompt);

        if (empty($words)) {
            return false;
        }

        $hits = $this->countHits($words);

        if (count($words) <= 8) {
            return $hits >= 1;
        }

        return $this->score($prompt) >= $threshold;
    }
}