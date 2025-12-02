1. Responsiveness, specifically when adding contacts to deals, switching between different document details and after AI-labeling is done.
We will have to add client side processing and big caching for optimistic updates, combined with specific react queries to make it seamless.
2. Email parsing, no newlines are printed at the moment, I see everything in one line.
3. Messages waiting for AI Labeling, instead of that I would like to show the card in the frontend with a loading symbol and fixing the need of refreshing the page to load new labels.
