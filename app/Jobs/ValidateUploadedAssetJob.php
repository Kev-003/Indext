<?php

namespace App\Jobs;

use App\Services\CloudflareR2StorageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ValidateUploadedAssetJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected string $objectKey,
        protected string $contentType,
        protected int $brandId,
        protected int $userId,
    ) {}

    public function handle(CloudflareR2StorageService $storage): void
    {
        $magicBytes = $storage->getObjectContent($this->objectKey, 12);
        $expectedMagicBytes = $this->getMagicBytes($this->contentType);

        if ($expectedMagicBytes !== '' && !str_starts_with($magicBytes, $expectedMagicBytes)) {
            $storage->deleteObject($this->objectKey);

            \Log::channel('single')->warning('Queued magic byte mismatch on upload', [
                'user_id' => $this->userId,
                'brand_id' => $this->brandId,
                'key' => $this->objectKey,
                'expected' => $expectedMagicBytes,
                'actual' => bin2hex($magicBytes),
            ]);
        }
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
