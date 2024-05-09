import React, { PureComponent } from 'react';

import { ConfirmButton, ConfirmModal, Button, Stack } from '@grafana/ui';
import { contextSrv } from 'app/core/core';
// @todo: replace barrel import path
import { i18nDate } from 'app/core/internationalization/index';
// @todo: replace barrel import path
import { AccessControlAction, UserSession } from 'app/types/index';

interface Props {
  sessions: UserSession[];

  onSessionRevoke: (id: number) => void;
  onAllSessionsRevoke: () => void;
}

interface State {
  showLogoutModal: boolean;
}

class BaseUserSessions extends PureComponent<Props, State> {
  forceAllLogoutButton = React.createRef<HTMLButtonElement>();
  state: State = {
    showLogoutModal: false,
  };

  showLogoutConfirmationModal = () => {
    this.setState({ showLogoutModal: true });
  };

  dismissLogoutConfirmationModal = () => {
    this.setState({ showLogoutModal: false }, () => {
      this.forceAllLogoutButton.current?.focus();
    });
  };

  onSessionRevoke = (id: number) => {
    return () => {
      this.props.onSessionRevoke(id);
    };
  };

  onAllSessionsRevoke = () => {
    this.setState({ showLogoutModal: false });
    this.props.onAllSessionsRevoke();
  };

  render() {
    const { sessions } = this.props;
    const { showLogoutModal } = this.state;

    const canLogout = contextSrv.hasPermission(AccessControlAction.UsersLogout);

    return (
      <div>
        <h3 className="page-heading">Sessions</h3>
        <Stack direction="column" gap={1.5}>
          <div>
            <table className="filter-table form-inline">
              <thead>
                <tr>
                  <th>Last seen</th>
                  <th>Logged on</th>
                  <th>IP address</th>
                  <th colSpan={2}>Browser and OS</th>
                </tr>
              </thead>
              <tbody>
                {sessions &&
                  sessions.map((session, index) => (
                    <tr key={`${session.id}-${index}`}>
                      <td>{session.isActive ? 'Now' : session.seenAt}</td>
                      <td>{i18nDate(session.createdAt, { dateStyle: 'long' })}</td>
                      <td>{session.clientIp}</td>
                      <td>{`${session.browser} on ${session.os} ${session.osVersion}`}</td>
                      <td>
                        <div className="pull-right">
                          {canLogout && (
                            <ConfirmButton
                              confirmText="Confirm logout"
                              confirmVariant="destructive"
                              onConfirm={this.onSessionRevoke(session.id)}
                            >
                              Force logout
                            </ConfirmButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div>
            {canLogout && sessions.length > 0 && (
              <Button variant="secondary" onClick={this.showLogoutConfirmationModal} ref={this.forceAllLogoutButton}>
                Force logout from all devices
              </Button>
            )}
            <ConfirmModal
              isOpen={showLogoutModal}
              title="Force logout from all devices"
              body="Are you sure you want to force logout from all devices?"
              confirmText="Force logout"
              onConfirm={this.onAllSessionsRevoke}
              onDismiss={this.dismissLogoutConfirmationModal}
            />
          </div>
        </Stack>
      </div>
    );
  }
}

export const UserSessions = BaseUserSessions;
