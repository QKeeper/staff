export const CommunityPermission = {
  MANAGE_COMMUNITY: "MANAGE_COMMUNITY",
  MANAGE_ROLES: "MANAGE_ROLES",
  MODERATE_POSTS: "MODERATE_POSTS",
  MODERATE_COMMENTS: "MODERATE_COMMENTS",
  BAN_MEMBERS: "BAN_MEMBERS",
  CREATE_POSTS: "CREATE_POSTS",
  CREATE_COMMENTS: "CREATE_COMMENTS",
} as const;

export type CommunityPermissionType =
  (typeof CommunityPermission)[keyof typeof CommunityPermission];

export const ROLE_DEFAULT_PERMISSIONS: Record<
  "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER",
  CommunityPermissionType[]
> = {
  OWNER: Object.values(CommunityPermission),
  ADMIN: [
    CommunityPermission.MANAGE_COMMUNITY,
    CommunityPermission.MANAGE_ROLES,
    CommunityPermission.MODERATE_POSTS,
    CommunityPermission.MODERATE_COMMENTS,
    CommunityPermission.BAN_MEMBERS,
    CommunityPermission.CREATE_POSTS,
    CommunityPermission.CREATE_COMMENTS,
  ],
  MODERATOR: [
    CommunityPermission.MODERATE_POSTS,
    CommunityPermission.MODERATE_COMMENTS,
    CommunityPermission.BAN_MEMBERS,
    CommunityPermission.CREATE_POSTS,
    CommunityPermission.CREATE_COMMENTS,
  ],
  MEMBER: [
    CommunityPermission.CREATE_POSTS,
    CommunityPermission.CREATE_COMMENTS,
  ],
};

export interface MemberWithPermissions {
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";
  permissions?: string[];
}

export const hasCommunityPermission = (
  member: MemberWithPermissions | null | undefined,
  requiredPermission: CommunityPermissionType,
  isGlobalAdmin = false,
): boolean => {
  if (isGlobalAdmin) return true;
  if (!member) return false;
  if (member.role === "OWNER") return true;

  // Check explicit permission grant in member record
  if (member.permissions && member.permissions.includes(requiredPermission)) {
    return true;
  }

  // Check role default permissions
  const defaultRolePermissions = ROLE_DEFAULT_PERMISSIONS[member.role] || [];
  return defaultRolePermissions.includes(requiredPermission);
};
