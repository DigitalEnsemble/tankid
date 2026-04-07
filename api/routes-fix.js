// Route ordering fix - specific routes must come before parameterized routes

// Correct order:
// 1. /facility/search (specific)
// 2. /facility/:id/sites (specific with param)
// 3. /facility/:id (parameterized catch-all)

// Similarly for other routes:
// 1. /site/:id/tanks (specific with param) 
// 2. /tank/:id/documents (specific with param)
// 3. /tank/:id (parameterized catch-all)