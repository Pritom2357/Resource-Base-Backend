export const BADGE_TYPES = {
  // Content creation badges
  RESOURCE_CREATOR: {
    BRONZE: { name: "Resource Creator", level: "bronze", requirement: 1, description: "Posted first resource" },
    SILVER: { name: "Resource Contributor", level: "silver", requirement: 5, description: "Posted 5 resources" },
    GOLD: { name: "Resource Author", level: "gold", requirement: 20, description: "Posted 20 resources" }
  },
  
  // Engagement badges
  UPVOTED: {
    BRONZE: { name: "Appreciated", level: "bronze", requirement: 10, description: "Received 10 upvotes" },
    SILVER: { name: "Popular", level: "silver", requirement: 50, description: "Received 50 upvotes" },
    GOLD: { name: "Influential", level: "gold", requirement: 200, description: "Received 200 upvotes" }
  },
  
  // Activity badges
  VISITING: {
    BRONZE: { name: "Regular", level: "bronze", requirement: 5, description: "Visited 5 consecutive days" },
    SILVER: { name: "Dedicated", level: "silver", requirement: 30, description: "Visited 30 consecutive days" },
    GOLD: { name: "Committed", level: "gold", requirement: 100, description: "Visited 100 consecutive days" }
  }
};