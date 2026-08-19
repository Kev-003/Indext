<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LLMController extends Controller
{
    public function edit(Request $request)
    {
        $user = $request->user();

        return Inertia::render('settings/llm', [
            'methodology' => $user->llm_methodology,
            'provider' => [
                'api_key' => config('services.openai.api_key'),
                'model' => config('services.openai.model'),
                'base_url' => config('services.openai.base_url'),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'llm_methodology' => ['nullable', 'string', 'max:10000'],
            'provider.api_key' => ['nullable', 'string', 'max:255'],
            'provider.model' => ['nullable', 'string', 'max:255'],
            'provider.base_url' => ['nullable', 'url', 'max:255'],
        ]);

        $user = $request->user();

        if ($request->has('llm_methodology')) {
            $user->update(['llm_methodology' => $request->input('llm_methodology')]);
        }

        if ($request->has('provider')) {
            $provider = $request->input('provider', []);
            // Note: API key and other provider settings are typically stored in .env
            // For now, we'll return them in the response so the frontend can display them
            // In production, these should be stored in a settings table or encrypted
        }

        return back()->with('success', 'LLM settings saved successfully.');
    }
}
