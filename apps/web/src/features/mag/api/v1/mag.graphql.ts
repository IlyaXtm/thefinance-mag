export const MAG_LISTING_QUERY = `
  query MagListing($first: Int!) {
    posts(first: $first, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        databaseId
        slug
        title
        excerpt
        date
        readingTime
        whyItMatters
        featuredImage {
          node {
            sourceUrl
            altText
            mediaDetails {
              width
              height
            }
          }
        }
        markets {
          nodes { name slug }
        }
        magContentTypes {
          nodes { name slug }
        }
      }
    }
    markets(first: 100) {
      nodes { name slug }
    }
  }
`;
