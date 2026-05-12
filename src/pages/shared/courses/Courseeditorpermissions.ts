/* ═══════════════════════════════════════════════════
   CourseEditor Permissions
   -------------------------------------------------------
   Import this wherever you wire up the CourseEditor route.
   Pass CREATOR_PERMISSIONS or ADMIN_PERMISSIONS as the
   `permissions` prop — or build a custom object for
   fine-grained control.
   ═══════════════════════════════════════════════════ */

export interface CourseEditorPermissions {
  /** Can hard-delete the course from the Publish step */
  canDeleteCourse: boolean;
  /** Can change status directly (draft/pending/published/rejected…) */
  canEditStatus: boolean;
  /** Can toggle the "Featured" flag */
  canEditFeatured: boolean;
  /**
   * True  → admin "Save as Published" button appears.
   * False → creator "Submit for Review" button appears.
   */
  canPublishDirectly: boolean;
  /** Can see and act on the approval / rejection UI in the Publish step */
  canReviewCourse: boolean;
}

export const CREATOR_PERMISSIONS: CourseEditorPermissions = {
  canDeleteCourse:    false,
  canEditStatus:      false,
  canEditFeatured:    false,
  canPublishDirectly: false,
  canReviewCourse:    false,
};

export const ADMIN_PERMISSIONS: CourseEditorPermissions = {
  canDeleteCourse:    true,
  canEditStatus:      true,
  canEditFeatured:    true,
  canPublishDirectly: true,
  canReviewCourse:    true,
};

