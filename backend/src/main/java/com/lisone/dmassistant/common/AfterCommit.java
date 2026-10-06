package com.lisone.dmassistant.common;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Defers side effects that can't be rolled back (like deleting files) until the transaction commits. */
public final class AfterCommit {

    private AfterCommit() {
    }

    public static void run(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    /** Runs the action if the surrounding transaction rolls back (e.g. to remove a file stored mid-transaction). */
    public static void onRollback(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    action.run();
                }
            }
        });
    }
}
