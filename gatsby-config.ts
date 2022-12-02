import type { GatsbyConfig } from "gatsby";

require("dotenv").config({
  path: `.env.${process.env.NODE_ENV}`,
});

const siteMetadata = {
  siteUrl: process.env.GATSBY_SITE_URL,
  title: "Wormhole USDC Demo",
};

const config: GatsbyConfig = {
  siteMetadata,
  // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
  // If you use VSCode you can also use the GraphQL plugin
  // Learn more at: https://gatsby.dev/graphql-typegen
  graphqlTypegen: true,
  plugins: [`gatsby-plugin-react-helmet`, `gatsby-plugin-top-layout`],
};

export default config;
