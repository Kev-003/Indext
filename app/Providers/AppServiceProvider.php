<?php

namespace App\Providers;

use App\Ai\Storage\SanitizedConversationStore;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Ai\Contracts\ConversationStore;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ConversationStore::class, fn (): SanitizedConversationStore => new SanitizedConversationStore(
            config('ai.conversations.connection'),
        ));

        $this->app->singleton(\App\Services\CloudflareR2StorageService::class);
        $this->app->singleton(\App\Services\AssetDownloadService::class, function ($app) {
            return new \App\Services\AssetDownloadService(
                $app->make(\Aws\S3\S3Client::class)
            );
        });
    }

    public function boot(): void
    {
        $this->configureDefaults();

        \App\Models\BrandAsset::observe(\App\Observers\BrandAssetObserver::class);
        \App\Models\BrandGuideline::observe(\App\Observers\BrandGuidelineObserver::class);
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
