<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;


Route::inertia('/', 'welcome')->name('home');

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');
        Route::get('workspace', [\App\Http\Controllers\WorkspaceController::class, 'index'])->name('workspace');
        Route::post('brands', [\App\Http\Controllers\BrandController::class, 'store'])->name('brands.store');
    });

Route::middleware(['auth'])->group(function () {
    Route::post('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');
});



require __DIR__.'/settings.php';


Route::prefix('api/brands')->middleware(['auth'])->group(function () {
    Route::delete('/{brand}', [\App\Http\Controllers\BrandController::class, 'destroy'])->name('brands.destroy');
    Route::patch('/{brand}/sort', [\App\Http\Controllers\BrandController::class, 'updateSort'])->name('brands.sort');
    Route::patch('/sort', [\App\Http\Controllers\BrandController::class, 'bulkSort'])->name('brands.sort.bulk');
    Route::post('/{brand}/chat/message', [\App\Http\Controllers\Api\ChatController::class, 'message'])->name('brands.chat.message');
});
