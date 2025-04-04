export const BADGE_TYPES = {
    RESOURCE_CREATOR: {
      BRONZE: { name: "Resource Creator", level: "bronze", requirement: 1, description: "Posted first resource" },
      SILVER: { name: "Resource Contributor", level: "silver", requirement: 10, description: "Posted 10 resources" },
      GOLD: { name: "Resource Author", level: "gold", requirement: 20, description: "Posted 20 resources" }
    },
    
    UPVOTED: {
      BRONZE: { name: "Appreciated", level: "bronze", requirement: 1, description: "Received 1 upvote" },
      SILVER: { name: "Popular", level: "silver", requirement: 25, description: "Received 25 upvotes" },
      GOLD: { name: "Influential", level: "gold", requirement: 150, description: "Received 150 upvotes" }
    },
    
    VISITING: {
      BRONZE: { name: "Regular", level: "bronze", requirement: 3, description: "Visited 3 consecutive days" },
      SILVER: { name: "Dedicated", level: "silver", requirement: 10, description: "Visited 10 consecutive days" },
      GOLD: { name: "Committed", level: "gold", requirement: 30, description: "Visited 30 consecutive days" }
    }
  };