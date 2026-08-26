<?php

namespace Tests\Unit;

use Illuminate\Support\Str;
use Laravel\Ai\Responses\Data\ToolCall;
use Tests\TestCase;

class SseStreamParserTest extends TestCase
{
    public function test_parse_sse_text_event(): void
    {
        $output = "event: text\ndata: {\"content\":\"Hello\"}\n\n";

        $events = $this->parseSseEvents($output);

        $this->assertCount(1, $events);
        $this->assertEquals('text', $events[0]['event']);
        $this->assertEquals('{"content":"Hello"}', $events[0]['data']);
    }

    public function test_parse_sse_tool_call_event(): void
    {
        $output = "event: tool_call\ndata: {\"id\":\"abc-123\",\"name\":\"invoke_color_hierarchy_builder\",\"arguments\":{\"brandId\":1}}\n\n";

        $events = $this->parseSseEvents($output);

        $this->assertCount(1, $events);
        $this->assertEquals('tool_call', $events[0]['event']);

        $data = json_decode($events[0]['data'], true);
        $this->assertEquals('abc-123', $data['id']);
        $this->assertEquals('invoke_color_hierarchy_builder', $data['name']);
        $this->assertEquals(1, $data['arguments']['brandId']);
    }

    public function test_parse_sse_mixed_events(): void
    {
        $output = "event: text\ndata: {\"content\":\"Hello\"}\n\n"
            . "event: text\ndata: {\"content\":\" World\"}\n\n"
            . "event: tool_call\ndata: {\"id\":\"tc-1\",\"name\":\"invoke_palette_picker\",\"arguments\":{\"brandId\":1}}\n\n"
            . "event: done\ndata: {\"conversation_id\":42}\n\n";

        $events = $this->parseSseEvents($output);

        $this->assertCount(4, $events);
        $this->assertEquals('text', $events[0]['event']);
        $this->assertEquals('text', $events[1]['event']);
        $this->assertEquals('tool_call', $events[2]['event']);
        $this->assertEquals('done', $events[3]['event']);
    }

    public function test_tool_call_merge_by_id(): void
    {
        $toolCalls = [];

        $fragments = [
            ['id' => 'tc-1', 'name' => 'invoke_color_hierarchy_builder', 'arguments' => ['brandId' => 1]],
            ['id' => 'tc-1', 'name' => 'invoke_color_hierarchy_builder', 'arguments' => ['suggestedPalette' => [['name' => 'Red', 'color' => '#FF0000']]]],
            ['id' => 'tc-1', 'name' => 'invoke_color_hierarchy_builder', 'arguments' => ['mode' => 'digital']],
        ];

        foreach ($fragments as $fragment) {
            $existing = array_find($toolCalls, fn ($t) => $t['id'] === $fragment['id']);
            if (!$existing) {
                $existing = array_find($toolCalls, fn ($t) => $t['name'] === $fragment['name']);
            }
            if ($existing) {
                $existing_key = array_search($existing, $toolCalls);
                $toolCalls[$existing_key]['arguments'] = array_merge($existing['arguments'], $fragment['arguments']);
            } else {
                $toolCalls[] = $fragment;
            }
        }

        $this->assertCount(1, $toolCalls);
        $this->assertEquals(1, $toolCalls[0]['arguments']['brandId']);
        $this->assertCount(1, $toolCalls[0]['arguments']['suggestedPalette']);
        $this->assertEquals('digital', $toolCalls[0]['arguments']['mode']);
    }

    public function test_tool_call_merge_by_name_when_ids_differ(): void
    {
        $toolCalls = [];

        $fragments = [
            ['id' => 'uuid-1', 'name' => 'invoke_color_hierarchy_builder', 'arguments' => ['brandId' => 1]],
            ['id' => 'uuid-2', 'name' => 'invoke_color_hierarchy_builder', 'arguments' => ['suggestedPalette' => [['name' => 'Red', 'color' => '#FF0000']]]],
            ['id' => 'uuid-3', 'name' => 'invoke_color_hierarchy_builder', 'arguments' => ['mode' => 'digital']],
        ];

        foreach ($fragments as $fragment) {
            $existing = array_find($toolCalls, fn ($t) => $t['id'] === $fragment['id']);
            if (!$existing) {
                $existing = array_find($toolCalls, fn ($t) => $t['name'] === $fragment['name']);
            }
            if ($existing) {
                $existing_key = array_search($existing, $toolCalls);
                $toolCalls[$existing_key]['arguments'] = array_merge($existing['arguments'], $fragment['arguments']);
                $toolCalls[$existing_key]['id'] = $fragment['id'];
            } else {
                $toolCalls[] = $fragment;
            }
        }

        $this->assertCount(1, $toolCalls);
        $this->assertEquals('uuid-3', $toolCalls[0]['id']);
        $this->assertEquals(1, $toolCalls[0]['arguments']['brandId']);
        $this->assertCount(1, $toolCalls[0]['arguments']['suggestedPalette']);
        $this->assertEquals('digital', $toolCalls[0]['arguments']['mode']);
    }

    public function test_tool_call_no_merge_for_different_names(): void
    {
        $toolCalls = [];

        $fragments = [
            ['id' => 'tc-1', 'name' => 'invoke_color_hierarchy_builder', 'arguments' => ['palette' => [['color' => '#FF0000']]]],
            ['id' => 'tc-2', 'name' => 'invoke_typography_pairing_selector', 'arguments' => ['pair' => ['bodyFont' => 'Inter']]],
        ];

        foreach ($fragments as $fragment) {
            $existing = array_find($toolCalls, fn ($t) => $t['id'] === $fragment['id']);
            if (!$existing) {
                $existing = array_find($toolCalls, fn ($t) => $t['name'] === $fragment['name']);
            }
            if ($existing) {
                $existing_key = array_search($existing, $toolCalls);
                $toolCalls[$existing_key]['arguments'] = array_merge($existing['arguments'], $fragment['arguments']);
            } else {
                $toolCalls[] = $fragment;
            }
        }

        $this->assertCount(2, $toolCalls);
        $this->assertEquals('invoke_color_hierarchy_builder', $toolCalls[0]['name']);
        $this->assertEquals('invoke_typography_pairing_selector', $toolCalls[1]['name']);
    }

    public function test_tool_call_json_is_valid(): void
    {
        $toolCall = new ToolCall(
            id: Str::uuid7()->toString(),
            name: 'invoke_color_hierarchy_builder',
            arguments: [
                'brandId' => 1,
                'suggestedPalette' => [
                    ['name' => 'Midnight Sky', 'color' => '#0B1D33', 'role' => 'Primary (60%)'],
                    ['name' => 'Alabaster Cream', 'color' => '#FDFBF7', 'role' => 'Secondary (30%)'],
                    ['name' => 'Warm Ochre', 'color' => '#D4A373', 'role' => 'Accent (10%)'],
                ],
                'mode' => 'digital',
            ]
        );

        $json = json_encode([
            'id' => $toolCall->id,
            'name' => $toolCall->name,
            'arguments' => $toolCall->arguments,
        ], JSON_INVALID_UTF8_SUBSTITUTE);

        $this->assertNotFalse($json, 'JSON encoding should succeed');
        $this->assertEquals(JSON_ERROR_NONE, json_last_error());

        $decoded = json_decode($json, true);
        $this->assertEquals($toolCall->id, $decoded['id']);
        $this->assertEquals($toolCall->name, $decoded['name']);
        $this->assertCount(3, $decoded['arguments']['suggestedPalette']);
    }

    private function parseSseEvents(string $output): array
    {
        $events = [];
        $lines = preg_split('/\r\n|\n/', $output);
        $event = 'message';
        $data = null;

        foreach ($lines as $line) {
            $line = rtrim($line, "\r");
            if ($line === '') {
                if ($data !== null) {
                    $events[] = ['event' => $event, 'data' => $data];
                    $event = 'message';
                    $data = null;
                }
                continue;
            }
            if (str_starts_with($line, 'event:')) {
                $event = trim(substr($line, 6));
            } elseif (str_starts_with($line, 'data:')) {
                $data = trim(substr($line, 5));
            }
        }
        if ($data !== null) {
            $events[] = ['event' => $event, 'data' => $data];
        }

        return $events;
    }

    private function array_find(array $array, callable $callback): mixed
    {
        foreach ($array as $key => $value) {
            if ($callback($value, $key)) {
                return $value;
            }
        }
        return null;
    }
}
