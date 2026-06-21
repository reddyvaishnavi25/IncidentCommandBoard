export type UserRole =
  | "police"
  | "fire"
  | "ems"
  | "dispatch"
  | "emergency_manager";

export type Permission =
  | "view_command_center"
  | "view_incidents"
  | "create_incident"
  | "edit_incident"
  | "assign_resources"
  | "view_resources"
  | "manage_resources"
  | "view_map"
  | "view_replay"
  | "run_simulation"
  | "view_consistency"
  | "view_ai_recommendations"
  | "manage_evacuation";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  police: [
    "view_command_center",
    "view_incidents",
    "edit_incident",
    "view_resources",
    "view_map",
    "view_replay",
    "view_consistency",
    "view_ai_recommendations",
  ],
  fire: [
    "view_command_center",
    "view_incidents",
    "edit_incident",
    "view_resources",
    "view_map",
    "view_replay",
    "view_consistency",
    "view_ai_recommendations",
  ],
  ems: [
    "view_command_center",
    "view_incidents",
    "edit_incident",
    "view_resources",
    "view_map",
    "view_replay",
    "view_consistency",
    "view_ai_recommendations",
  ],
  dispatch: [
    "view_command_center",
    "view_incidents",
    "create_incident",
    "edit_incident",
    "assign_resources",
    "view_resources",
    "manage_resources",
    "view_map",
    "view_replay",
    "view_consistency",
    "view_ai_recommendations",
  ],
  emergency_manager: [
    "view_command_center",
    "view_incidents",
    "create_incident",
    "edit_incident",
    "assign_resources",
    "view_resources",
    "manage_resources",
    "view_map",
    "view_replay",
    "run_simulation",
    "view_consistency",
    "view_ai_recommendations",
    "manage_evacuation",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRoleDashboardConfig(role: UserRole) {
  const configs: Record<
    UserRole,
    { title: string; subtitle: string; accent: string; focus: string[] }
  > = {
    police: {
      title: "Police Operations",
      subtitle: "Law enforcement coordination & perimeter control",
      accent: "blue",
      focus: ["Perimeter Security", "Traffic Control", "Evacuation Support"],
    },
    fire: {
      title: "Fire Operations",
      subtitle: "Structural fire response & hazmat coordination",
      accent: "red",
      focus: ["Fire Suppression", "Rescue Operations", "Hazmat Response"],
    },
    ems: {
      title: "EMS Operations",
      subtitle: "Medical response & triage coordination",
      accent: "emerald",
      focus: ["Medical Triage", "Transport Coordination", "Mass Casualty"],
    },
    dispatch: {
      title: "Dispatch Center",
      subtitle: "Resource allocation & incident dispatch",
      accent: "amber",
      focus: ["Resource Assignment", "Unit Tracking", "Mutual Aid"],
    },
    emergency_manager: {
      title: "Emergency Management",
      subtitle: "County-wide incident command & coordination",
      accent: "purple",
      focus: ["Incident Command", "Multi-Agency Coord", "Public Safety"],
    },
  };
  return configs[role];
}
