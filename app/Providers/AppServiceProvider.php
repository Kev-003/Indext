<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\LLM\LLMProvider::class, function ($app) {
            return new \App\Services\LLM\OpenAIProvider(
                http: $app->make(\Illuminate\Http\Client\Factory::class),
                apiKey: config('services.openai.api_key', env('OPENAI_API_KEY', '')),
                model: config('services.openai.model', env('OPENAI_MODEL', 'gpt-4o-mini')),
                baseUrl: config('services.openai.base_url', env('OPENAI_BASE_URL', 'https://api.openai.com/v1')),
            );
        });

        $this->app->singleton(\App\Services\LLM\ToolRegistry::class);
        $this->app->singleton(\App\Services\LLM\SystemPromptBuilder::class);
        $this->app->singleton(\App\Services\BrandChatStore::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
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
