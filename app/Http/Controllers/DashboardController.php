<?php

namespace App\Http\Controllers;

use App\Models\TeamInvitation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $email = strtolower($request->user()->email);

        $pendingInvitations = TeamInvitation::query()
            ->with(['inviter', 'team'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereNull('accepted_at')
            ->where(fn ($query) => $query
                ->whereNull('expires_at')
                ->orWhere('expires_at', '>=', now()))
            ->latest()
            ->get()
            ->map(fn (TeamInvitation $invitation) => [
                'code' => $invitation->code,
                'inviterName' => $invitation->inviter->name,
                'team' => [
                    'name' => $invitation->team->name,
                    'slug' => $invitation->team->slug,
                ],
            ]);

        $teamSlug = $request->route('current_team');
        $team = \App\Models\Team::where('slug', $teamSlug)->firstOrFail();

        $recentBrands = \App\Models\Brand::where('team_id', $team->id)
            ->latest('updated_at')
            ->take(5)
            ->get()
            ->map(fn (\App\Models\Brand $brand) => [
                'id' => $brand->id,
                'slug' => $brand->slug,
                'name' => $brand->name,
                'industry' => $brand->industry,
                'status' => $brand->status,
                'updated_at' => $brand->updated_at->diffForHumans(),
            ]);

        return Inertia::render('dashboard', [
            'pendingInvitations' => $pendingInvitations,
            'recentBrands' => $recentBrands,
        ]);
    }
}
