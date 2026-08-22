<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Team;
use Aws\S3\S3Client;
use Illuminate\Support\Facades\Redis;

class AssetDownloadService
{
    protected S3Client $client;

    protected string $bucket;

    public function __construct(S3Client $client)
    {
        $this->client = $client;
        $this->bucket = config('services.cloudflare-r2.bucket', 'brand-assets');
    }

    public function generatePresignedGetUrl(string $objectKey, Brand $brand, Team $team, int $ttl = 900): string
    {
        $redisKey = 'r2:download:'.md5($objectKey.':'.time());

        Redis::setex($redisKey, $ttl, json_encode([
            'brand_id' => $brand->id,
            'team_id' => $team->id,
            'used' => false,
        ]));

        $cmd = $this->client->getCommand('GetObject', [
            'Bucket' => $this->bucket,
            'Key' => $objectKey,
        ]);

        $request = $this->client->createPresignedRequest($cmd, '+'.$ttl.' seconds');

        return (string) $request->getUri();
    }

    public function verifyAndConsumeDownload(string $objectKey, Brand $brand, Team $team): bool
    {
        $keys = Redis::keys('r2:download:*');

        foreach ($keys as $key) {
            $data = json_decode(Redis::get($key), true);

            if (!$data) {
                continue;
            }

            if ($data['brand_id'] === $brand->id && $data['team_id'] === $team->id && !$data['used']) {
                $data['used'] = true;
                Redis::setex($key, 900, json_encode($data));

                return true;
            }
        }

        return false;
    }
}
