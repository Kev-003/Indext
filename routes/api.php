<?php

use App\Http\Controllers\Api\BrandFinalizationController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\StorageController;
use App\Http\Controllers\BrandController;
use Illuminate\Support\Facades\Route;

// These routes are consumed by the Inertia SPA from the same origin.
// auth:web is used explicitly because:
// - statefulApi() starts the session for same-origin requests via EnsureFrontendRequestsAreStateful
// - there is no separate 'sanctum' guard configured in auth.php
// - the default 'auth' middleware on the api group does NOT start a session, causing 401s


Route::middleware(['web', 'auth:web'])->get('/debug-auth', function (\Illuminate\Http\Request $request) {
    return response()->json([
        'sanctum_attr' => $request->attributes->get('sanctum'), // true only if fromFrontend() matched
        'auth_check' => auth()->check(),
        'auth_guard_web' => auth('web')->check(),
        'user_id' => auth()->id(),
        'session_id' => session()->getId(),
        'has_session_cookie' => $request->hasCookie('laravel-session'),
    ]);
});

Route::middleware(['web', 'auth:web'])
    ->prefix('brands/{brand}')
    ->group(function () {
        Route::post('/finalize', [BrandFinalizationController::class, 'finalize'])->name('api.brands.finalize');
    });

Route::middleware(['web', 'auth:web', 'ai.guardrail'])
    ->prefix('brands/{brand}')
    ->group(function () {
        Route::post('/chat/message', [ChatController::class, 'message'])->name('api.chat.message');
    });

Route::middleware(['web', 'auth:web'])
    ->prefix('storage')
    ->group(function () {
        Route::get('/presigned-url', [StorageController::class, 'presignedUrl'])->name('api.storage.presigned-url');
        Route::post('/confirm-upload', [StorageController::class, 'confirmUpload'])->name('api.storage.confirm-upload');
    });



