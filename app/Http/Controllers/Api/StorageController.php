<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Services\CloudflareR2StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StorageController extends Controller
{
    public function __construct(
        protected CloudflareR2StorageService $storage,
    ) {}

    public function presignedUrl(Request $request, Brand $brand): JsonResponse
    {
        $user = $request->user();

        $team = $brand->team;
        if ($team && !$user->belongsToTeam($team)) {
            abort(403);
        }
        if (!$team && $brand->user_id !== $user->id) {
            abort(403);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'filename' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', 'in:image/svg+xml,image/png,image/jpeg,image/webp'],
            'size' => ['required', 'integer', 'min:1'],
        ]);

        $validator->validate();

        $teamId = $team?->id ?? $user->currentTeam?->id ?? $user->id;

        try {
            $result = $this->storage->generatePresignedPutUrl(
                filename: $request->input('filename'),
                contentType: $request->input('content_type'),
                size: (int) $request->input('size'),
                brandId: $brand->id,
                teamId: $teamId,
            );

            return response()->json($result);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }
    }

    public function confirmUpload(Request $request, Brand $brand): JsonResponse
    {
        $user = $request->user();

        $team = $brand->team;
        if ($team && !$user->belongsToTeam($team)) {
            abort(403);
        }
        if (!$team && $brand->user_id !== $user->id) {
            abort(403);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'key' => ['required', 'string'],
            'content_type' => ['required', 'string', 'in:image/svg+xml,image/png,image/jpeg,image/webp'],
        ]);

        $validator->validate();

        $objectKey = $request->input('key');
        $declaredContentType = $request->input('content_type');

        $magicBytes = $this->storage->getObjectContent($objectKey, 12);
        $expectedMagicBytes = $this->getMagicBytes($declaredContentType);

        if ($expectedMagicBytes !== '' && !str_starts_with($magicBytes, $expectedMagicBytes)) {
            $this->storage->deleteObject($objectKey);

            \Log::channel('single')->warning('Magic byte mismatch on upload', [
                'user_id' => $user->id,
                'brand_id' => $brand->id,
                'key' => $objectKey,
                'expected' => $expectedMagicBytes,
                'actual' => bin2hex($magicBytes),
            ]);

            return response()->json(['message' => 'Uploaded file type does not match declared content type.'], 400);
        }

        return response()->json(['message' => 'Upload confirmed.', 'key' => $objectKey]);
    }

    protected function getMagicBytes(string $contentType): string
    {
        return match ($contentType) {
            'image/svg+xml' => '<svg',
            'image/png' => "\x89PNG\r\n\x1a\n",
            'image/jpeg' => "\xff\xd8\xff",
            'image/webp' => 'RIFF',
            default => '',
        };
    }
}
