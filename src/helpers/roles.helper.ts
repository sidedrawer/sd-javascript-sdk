import {SideDrawerRole} from "../models/side-drawer-role.enum";
import {RecordRole} from "../models/record-role.enum";

export class RolesHelper {
    public static getSideDrawerRole = (roles: SideDrawerRole[]): SideDrawerRole => {
        if (!!roles && roles.length > 0) {
            return !!roles.find(role => role === SideDrawerRole.owner)
                ? SideDrawerRole.owner
                : !!roles.find(role => role === SideDrawerRole.editor)
                    ? SideDrawerRole.editor
                    : !!roles.find(role => role === SideDrawerRole.viewer)
                        ? SideDrawerRole.viewer
                        : SideDrawerRole.info;
        } else {
            return SideDrawerRole.info;
        }
    };

    public static compareSideDrawerRoles = (role1: SideDrawerRole, role2: SideDrawerRole): SideDrawerRole | RecordRole => {
        if (role1 === SideDrawerRole.owner || role2 === SideDrawerRole.owner) {
            return SideDrawerRole.owner;
        }
        if (role1 === SideDrawerRole.editor || role2 === SideDrawerRole.editor) {
            return SideDrawerRole.editor;
        }
        if (role1 === SideDrawerRole.viewer || role2 === SideDrawerRole.viewer) {
            return SideDrawerRole.viewer;
        }
        if (role1 === SideDrawerRole.info || role2 === SideDrawerRole.info) {
            return SideDrawerRole.info;
        }
        return RolesHelper.compareRecordRole(role1, role2);
    };

    public static getSideDrawerRolesOrdinalToSort = (role: string): number => {
        switch (role) {
            case SideDrawerRole.owner:
                return 1;
            case SideDrawerRole.editor:
                return 2;
            case SideDrawerRole.viewer:
                return 3;
            case SideDrawerRole.info:
                return 4;
            default:
                return RolesHelper.getRecordRoleOrdinalToSort(role);
        }
    };

    public static getRecordRole = (roles: RecordRole[]): RecordRole => {
        if (!!roles && roles.length > 0) {
            return !!roles.find(role => role === RecordRole.owner)
                ? RecordRole.owner
                : !!roles.find(role => role === RecordRole.editor)
                    ? RecordRole.editor
                    : !!roles.find(role => role === RecordRole.viewer)
                        ? RecordRole.viewer
                        : RecordRole.info;
        } else {
            return RecordRole.info;
        }
    };

    public static compareRecordRole = (role1: RecordRole, role2: RecordRole): RecordRole => {
        if (role1 === RecordRole.owner || role2 === RecordRole.owner) {
            return RecordRole.owner;
        }
        if (role1 === RecordRole.editor || role2 === RecordRole.editor) {
            return RecordRole.editor;
        }
        if (role1 === RecordRole.viewer || role2 === RecordRole.viewer) {
            return RecordRole.viewer;
        }
        return RecordRole.info;
    };

    public static getRecordRoleOrdinalToSort = (role: string): number => {
        switch (role) {
            case RecordRole.owner:
                return 5;
            case RecordRole.editor:
                return 6;
            case RecordRole.viewer:
                return 7;
            case RecordRole.info:
                return 8;
            default:
                return 99;
        }
    };
}
