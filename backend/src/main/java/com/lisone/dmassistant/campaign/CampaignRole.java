package com.lisone.dmassistant.campaign;

public enum CampaignRole {
    /** Created the campaign: manages members and roles, and has every master permission. */
    OWNER,
    /** Game master: builds maps, markers and session logs, sees hidden content. */
    MASTER,
    /** Player: sees only revealed content and keeps private notes. */
    PLAYER;

    public boolean canManageWorld() {
        return this == OWNER || this == MASTER;
    }

    public boolean canManageMembers() {
        return this == OWNER;
    }
}
