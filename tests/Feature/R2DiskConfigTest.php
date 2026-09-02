<?php

namespace Tests\Feature;

use App\Services\CloudflareR2StorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class R2DiskConfigTest extends TestCase
{
    use RefreshDatabase;

    public function test_r2_disk_is_configured_with_s3_driver(): void
    {
        $diskConfig = Config::get('filesystems.disks.r2');

        $this->assertIsArray($diskConfig, 'r2 disk configuration must exist in filesystems.php');
        $this->assertEquals('s3', $diskConfig['driver'] ?? null);
        $this->assertEquals('us-east-1', $diskConfig['region'] ?? null);
        $this->assertEquals('brand-assets', $diskConfig['bucket'] ?? null);
    }

    public function test_public_url_returns_cdn_domain_when_configured(): void
    {
        Config::set('filesystems.disks.r2.url', 'https://assets.example.com');

        $service = new CloudflareR2StorageService();
        $url = $service->getPublicUrl('brands/123/mark.svg');

        $this->assertEquals('https://assets.example.com/brands/123/mark.svg', $url);
    }

    public function test_public_url_falls_back_to_s3_url_when_cdn_not_set(): void
    {
        Config::set('filesystems.disks.r2.url', '');
        Config::set('filesystems.disks.r2.endpoint', 'https://s3.us-east-1.cloudflare.com');
        Config::set('filesystems.disks.r2.bucket', 'brand-assets');

        $service = new CloudflareR2StorageService();
        $url = $service->getPublicUrl('brands/123/mark.svg');

        $this->assertNotEmpty($url);
        $this->assertStringContainsString('brands/123/mark.svg', $url);
    }
}
