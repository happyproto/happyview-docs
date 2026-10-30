// The site.standard publication the blog posts belong to (sequoia.json).
export const PUBLICATION_URI = 'at://did:plc:qneu5uamqs6cug7sjobbaexm/site.standard.publication/3mpokbucn3y26';

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
