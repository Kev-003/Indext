<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\Response;

class AIGuardrailMiddleware
{
    protected int $requestsPerMinute;

    protected int $tokensPerHour;

    public function __construct()
    {
        $this->requestsPerMinute = (int) env('RATE_LIMIT_REQUESTS_PER_MINUTE', 5);
        $this->tokensPerHour = (int) env('RATE_LIMIT_TOKENS_PER_HOUR_TRIAL', 50000);
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $userId = $user->id;
        $minuteKey = "ai:rate:{$userId}:min";
        $hourKey = "ai:tokens:{$userId}:hour";

        $minuteCount = (int) Redis::get($minuteKey);
        if ($minuteCount >= $this->requestsPerMinute) {
            \Log::channel('single')->info('AI rate limit breached', [
                'user_id' => $userId,
                'window' => 'minute',
                'usage' => $minuteCount,
            ]);

            return response()->json([
                'message' => 'Too many requests. Please wait before sending another prompt.',
                'retry_after' => 60,
            ], 429);
        }

        $hourTokens = (int) Redis::get($hourKey);
        if ($hourTokens >= $this->tokensPerHour) {
            \Log::channel('single')->info('AI token limit breached', [
                'user_id' => $userId,
                'window' => 'hour',
                'usage' => $hourTokens,
            ]);

            return response()->json([
                'message' => 'Hourly token limit reached. Please wait before continuing.',
                'retry_after' => 3600,
            ], 429);
        }

        $response = $next($request);

        if ($response instanceof \Symfony\Component\HttpFoundation\StreamedResponse) {
            $this->registerStreamCallbacks($response, $userId, $minuteKey, $hourKey, $minuteCount);
        }

        $response->headers->set('X-RateLimit-Limit-Minute', (string) $this->requestsPerMinute);
        $response->headers->set('X-RateLimit-Remaining-Minute', (string) max(0, $this->requestsPerMinute - $minuteCount - 1));
        $response->headers->set('X-RateLimit-Limit-Tokens-Hour', (string) $this->tokensPerHour);
        $response->headers->set('X-RateLimit-Remaining-Tokens-Hour', (string) max(0, $this->tokensPerHour - $hourTokens));

        return $response;
    }

    protected function registerStreamCallbacks(\Symfony\Component\HttpFoundation\StreamedResponse $response, int $userId, string $minuteKey, string $hourKey, int $minuteCount): void
    {
        $previousCallback = $response->getCallback();
        $tokensAccumulated = 0;

        $response->setCallback(function () use ($previousCallback, $userId, $minuteKey, $hourKey, $minuteCount, &$tokensAccumulated) {
            if ($previousCallback) {
                $previousCallback();
            }

            Redis::incr($minuteKey);
            Redis::expire($minuteKey, 60);

            Redis::incrby($hourKey, $tokensAccumulated);
            Redis::expire($hourKey, 3600);
        });

        register_shutdown_function(function () use ($userId, $hourKey, &$tokensAccumulated) {
            if ($tokensAccumulated > 0) {
                Redis::incrby($hourKey, $tokensAccumulated);
                Redis::expire($hourKey, 3600);
            }
        });
    }
}
