// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     kinds/gen.go
// Using jennies:
//     GoTypesJenny
//     LatestJenny
//
// Run 'make gen-cue' from repository root to regenerate.

package preference

// Defines values for Theme.
const (
	ThemeDark Theme = "dark"

	ThemeLight Theme = "light"
)

// Defines values for Timezone.
const (
	TimezoneBrowser Timezone = "browser"

	TimezoneUtc Timezone = "utc"
)

// Defines values for WeekStart.
const (
	WeekStartFriday WeekStart = "friday"

	WeekStartMonday WeekStart = "monday"

	WeekStartSaturday WeekStart = "saturday"

	WeekStartSunday WeekStart = "sunday"

	WeekStartThursday WeekStart = "thursday"

	WeekStartTuesday WeekStart = "tuesday"

	WeekStartWednesday WeekStart = "wednesday"
)

// NavLink defines model for NavLink.
type NavLink struct {
	Id     *string `json:"id,omitempty"`
	Target *string `json:"target,omitempty"`
	Text   *string `json:"text,omitempty"`
	Url    *string `json:"url,omitempty"`
}

// NavbarPreference defines model for NavbarPreference.
type NavbarPreference struct {
	SavedItems []NavLink `json:"savedItems"`
}

// QueryHistoryPreference defines model for QueryHistoryPreference.
type QueryHistoryPreference struct {
	HomeTab *string `json:"homeTab,omitempty"`
}

// Preference defines model for preference.
type Preference struct {
	// Numeric unique identifier for the home dashboard
	HomeDashboardId *int64 `json:"homeDashboardId,omitempty"`

	// Unique identifier for the home dashboard
	HomeDashboardUID *string `json:"homeDashboardUID,omitempty"`

	// Language preference
	Language     *string                 `json:"language,omitempty"`
	Navbar       *NavbarPreference       `json:"navbar,omitempty"`
	QueryHistory *QueryHistoryPreference `json:"queryHistory,omitempty"`

	// Theme preference
	Theme *Theme `json:"theme,omitempty"`

	// Timezone preference
	Timezone *Timezone `json:"timezone,omitempty"`

	// Starting day of the week
	WeekStart *WeekStart `json:"weekStart,omitempty"`
}

// Theme preference
type Theme string

// Timezone preference
type Timezone string

// Starting day of the week
type WeekStart string
