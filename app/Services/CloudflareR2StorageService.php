<?php

namespace App\Services;

use Aws\Exception\AwsException;
use Aws\S3\S3Client;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Redis;

class CloudflareR2StorageService
{
    protected S3Client $client;

    protected string $bucket;

    protected string $cdnDomain;

    public function __construct()
    {
        $config = Config::get('filesystems.disks.r2', []);

        $this->client = new S3Client([
            'version' => 'latest',
            'region' => $config['region'] ?? 'us-east-1',
            'endpoint' => $config['endpoint'] ?? 'https://s3.us-east-1.cloudflare.com',
            'use_path_style_endpoint' => $config['use_path_style_endpoint'] ?? true,
            'credentials' => [
                'key' => $config['key'] ?? '',
                'secret' => $config['secret'] ?? '',
            ],
        ]);

        $this->bucket = (string) ($config['bucket'] ?? 'brand-assets');
        $this->cdnDomain = rtrim((string) ($config['url'] ?? ''), '/');
    }

    public function generatePresignedPutUrl(string $filename, string $contentType, int $size, int $brandId, int $teamId): array
    {
        $allowedMimeTypes = [
            'image/svg+xml',
            'image/png',
            'image/jpeg',
            'image/webp',
        ];

        $maxSizes = [
            'image/svg+xml' => 2 * 1024 * 1024,
            'image/png' => 5 * 1024 * 1024,
            'image/jpeg' => 5 * 1024 * 1024,
            'image/webp' => 5 * 1024 * 1024,
        ];

        if (! in_array($contentType, $allowedMimeTypes, true)) {
            throw new \InvalidArgumentException('Unsupported content type.');
        }

        if ($size > ($maxSizes[$contentType] ?? 0)) {
            throw new \InvalidArgumentException('File exceeds maximum allowed size.');
        }

        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowedExtensions = ['svg', 'png', 'jpg', 'jpeg', 'webp'];

        if (! in_array($extension, $allowedExtensions, true)) {
            throw new \InvalidArgumentException('Unsupported file extension.');
        }

        $mimeExtensionMap = [
            'image/svg+xml' => ['svg'],
            'image/png' => ['png'],
            'image/jpeg' => ['jpg', 'jpeg'],
            'image/webp' => ['webp'],
        ];

        if (! in_array($extension, $mimeExtensionMap[$contentType], true)) {
            throw new \InvalidArgumentException('File extension does not match content type.');
        }

        $objectKey = 'brands/'.$brandId.'/'.uniqid().'_'.basename($filename);
        $redisKey = 'r2:presigned:'.md5($objectKey);

        if (Redis::get($redisKey)) {
            throw new \RuntimeException('Presigned URL already used or pending.');
        }

        Redis::setex($redisKey, 300, '1');

        $cmd = $this->client->getCommand('PutObject', [
            'Bucket' => $this->bucket,
            'Key' => $objectKey,
            'ContentType' => $contentType,
            'Metadata' => [
                'brand-id' => (string) $brandId,
                'team-id' => (string) $teamId,
            ],
        ]);

        $request = $this->client->createPresignedRequest($cmd, '+5 minutes');

        return [
            'url' => (string) $request->getUri(),
            'key' => $objectKey,
            'expires_in' => 300,
        ];
    }

    public function getPublicUrl(string $objectKey): string
    {
        if ($this->cdnDomain !== '') {
            return $this->cdnDomain.'/'.$objectKey;
        }

        return (string) $this->client->getObjectUrl($this->bucket, $objectKey);
    }

    public function deleteObject(string $objectKey): void
    {
        $this->client->deleteObject([
            'Bucket' => $this->bucket,
            'Key' => $objectKey,
        ]);
    }

    public function getObjectMetadata(string $objectKey): array
    {
        try {
            $result = $this->client->headObject([
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
            ]);

            return [
                'size' => $result['ContentLength'] ?? 0,
                'content_type' => $result['ContentType'] ?? '',
                'metadata' => $result['Metadata'] ?? [],
            ];
        } catch (AwsException $e) {
            return [];
        }
    }

    public function getObjectContent(string $objectKey, int $length = 12): string
    {
        try {
            $result = $this->client->getObject([
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
                'Range' => 'bytes=0-'.($length - 1),
            ]);

            return (string) ($result['Body'] ?? '');
        } catch (AwsException $e) {
            return '';
        }
    }
}
