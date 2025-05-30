# Cache Integration Test Plan

## Overview
This document outlines the testing plan for the TanStack Query caching implementation with automatic revalidation for the repositories page.

## Features Implemented

### 1. Enhanced API Route (`/api/repositories`)
- ✅ Pagination support with `page` parameter
- ✅ Search functionality with `search` parameter
- ✅ Language filtering with `language` parameter
- ✅ Sorting options with `sortBy` parameter
- ✅ Response metadata (hasNextPage, total, etc.)

### 2. Custom React Hooks (`use-repositories.ts`)
- ✅ `useRepositories()` - Infinite query with filters
- ✅ `useInvalidateRepositories()` - Cache invalidation
- ✅ `useRepositoriesStats()` - Statistics calculation

### 3. Refactored Repositories Page
- ✅ Infinite scroll implementation
- ✅ Real-time search with debouncing
- ✅ Language and sort filtering
- ✅ Automatic cache management
- ✅ Loading states and error handling

### 4. Cache Invalidation Integration
- ✅ Individual repository page integration
- ✅ Automatic invalidation on new repository analysis
- ✅ Automatic invalidation on re-analysis

## Test Scenarios

### Test 1: Initial Page Load
1. Navigate to `/repositories`
2. ✅ Page should load with initial set of repositories
3. ✅ Infinite scroll should be available
4. ✅ Search, language filter, and sort controls should be visible

### Test 2: Infinite Scroll
1. On repositories page, scroll to bottom
2. ✅ Should automatically load more repositories
3. ✅ Loading indicator should appear
4. ✅ New repositories should append to the list

### Test 3: Search Functionality
1. Type in search box on repositories page
2. ✅ Should debounce input (wait ~300ms)
3. ✅ Should filter repositories in real-time
4. ✅ Should maintain infinite scroll for search results

### Test 4: Language Filtering
1. Select a language from the filter dropdown
2. ✅ Should filter repositories by language
3. ✅ Should reset to first page
4. ✅ Should maintain infinite scroll for filtered results

### Test 5: Sort Functionality
1. Change sort order (stars, forks, updated, etc.)
2. ✅ Should re-order repositories
3. ✅ Should reset to first page
4. ✅ Should maintain infinite scroll for sorted results

### Test 6: Cache Invalidation - New Repository Analysis
1. Navigate to a new repository (e.g., `/microsoft/typescript`)
2. Wait for analysis to complete
3. Navigate back to `/repositories`
4. ✅ New repository should appear in the list
5. ✅ Stats should be updated

### Test 7: Cache Invalidation - Re-analysis
1. On any repository page, click "Re-analyze" button
2. Wait for re-analysis to complete
3. Navigate to `/repositories`
4. ✅ Repository should show updated information
5. ✅ Updated timestamp should be recent

### Test 8: Statistics Calculation
1. On repositories page, check the stats display
2. ✅ Should show total repositories count
3. ✅ Should show language distribution
4. ✅ Should update when cache is invalidated

## Performance Tests

### Test 9: Cache Efficiency
1. Load repositories page
2. Navigate away and back
3. ✅ Should load from cache (fast load)
4. ✅ Should not refetch unless stale

### Test 10: Memory Management
1. Use infinite scroll extensively
2. Check browser memory usage
3. ✅ Should not cause memory leaks
4. ✅ Should manage virtualization if needed

## Error Handling Tests

### Test 11: Network Errors
1. Disconnect network while on repositories page
2. ✅ Should show appropriate error message
3. ✅ Should offer retry functionality
4. ✅ Should recover when network is restored

### Test 12: API Errors
1. Simulate API errors (500, 404, etc.)
2. ✅ Should handle gracefully
3. ✅ Should show user-friendly error messages
4. ✅ Should not break the application

## Integration Tests

### Test 13: Cross-Page Navigation
1. Search for a repository on repositories page
2. Click on a repository to view details
3. Navigate back using browser back button
4. ✅ Should preserve search state
5. ✅ Should preserve scroll position

### Test 14: Multiple Tab Behavior
1. Open repositories page in multiple tabs
2. Analyze a new repository in one tab
3. ✅ Other tabs should eventually update (if implemented)
4. ✅ Cache should be consistent across tabs

## Browser Compatibility Tests

### Test 15: Modern Browsers
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)

### Test 16: Mobile Devices
- ✅ Touch scrolling for infinite scroll
- ✅ Responsive design
- ✅ Touch interactions for filters

## Notes for Testers

### Key Implementation Details
- Uses TanStack Query for caching and data management
- Infinite scroll implemented with Intersection Observer
- Search debounced at 300ms
- Cache invalidation happens automatically on repository analysis
- Default page size is 20 repositories
- Cache TTL (staleTime) is 5 minutes for repository list

### Performance Expectations
- Initial load: < 2 seconds
- Infinite scroll load: < 1 second
- Search response: < 500ms (after debounce)
- Cache invalidation: Immediate UI update

### Expected Error Messages
- Network errors: "Failed to load repositories. Please check your connection."
- API errors: "Something went wrong. Please try again later."
- No results: "No repositories found matching your criteria."

## Success Criteria
All tests should pass for the implementation to be considered complete and ready for production.
