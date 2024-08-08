package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/grafana/grafana/pkg/apimachinery/errutil"
	"github.com/grafana/grafana/pkg/apimachinery/identity"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/authn"
	"github.com/grafana/grafana/pkg/services/login"
	"github.com/grafana/grafana/pkg/services/loginattempt"
	"github.com/grafana/grafana/pkg/services/notifications"
	"github.com/grafana/grafana/pkg/services/temp_user"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/util"
)

var (
	errInvalidPasswordless    = errutil.Unauthorized("passwordless-auth.invalid", errutil.WithPublicMessage("Invalid code"))
	errPasswordlessAuthFailed = errutil.Unauthorized("passwordless-auth.failed", errutil.WithPublicMessage("Invalid code"))
)

const passwordlessKeyPrefix = "passwordless-%s"

var _ authn.PasswordlessClient = new(Passwordless)

func ProvidePasswordless(loginAttempts loginattempt.Service, userService user.Service, tempUserService tempuser.Service, notificationService notifications.Service, cache passwordlessCache) *Passwordless {
	return &Passwordless{loginAttempts, userService, tempUserService, notificationService, cache, log.New("authn.passwordless")}
}

type passwordlessCache interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, expire time.Duration) error
	Delete(ctx context.Context, key string) error
}

type PasswordlessCacheEntry struct {
	Email            string `json:"email"`
	ConfirmationCode string `json:"confirmation_code"`
	SentDate         string `json:"sent_date"`
}

type Passwordless struct {
	loginAttempts       loginattempt.Service
	userService         user.Service
	tempUserService     tempuser.Service
	notificationService notifications.Service
	cache               passwordlessCache
	log                 log.Logger
}

// Authenticate implements authn.Client.
func (c *Passwordless) Authenticate(ctx context.Context, r *authn.Request) (*authn.Identity, error) {
	// TODO: colin - confirm that this is the right way to get query params
	// TODO: colin - do we need separate authenticate and authenticatePasswordless methods?
	code := r.HTTPRequest.URL.Query().Get("code")
	confirmationCode := r.HTTPRequest.URL.Query().Get("confirmationCode")

	return c.AuthenticatePasswordless(ctx, r, code, confirmationCode)
}

func (c *Passwordless) IsEnabled() bool {
	return true
}

func (c *Passwordless) Name() string {
	return authn.ClientPasswordless
}

func (c *Passwordless) StartPasswordless(ctx context.Context, r *authn.Request, email string) error {
	// 1. check if is existing user with email or user invite with email
	var existingUser *user.User
	var tempUser []*tempuser.TempUserDTO
	var err error

	if !util.IsEmail(email) {
		return errPasswordlessAuthFailed.Errorf("invalid email %s", email)
	}

	// TODO: colin - check passwordless cache if user has already been sent a passwordless link

	existingUser, err = c.userService.GetByEmail(ctx, &user.GetUserByEmailQuery{Email: email})
	if err != nil {
		return err
	}

	if existingUser == nil {
		// TODO: colin - set Status in GetTempUsersQuery so that revoked invites are ignored
		tempUser, err = c.tempUserService.GetTempUsersQuery(ctx, &tempuser.GetTempUsersQuery{Email: email})
		if err != nil {
			return err
		}
		if tempUser == nil {
			return errPasswordlessAuthFailed.Errorf("no user found with email %s", email)
		}
	} else {
		// 2. if existing user, send email with passwordless link
		alphabet := []byte("BCDFGHJKLMNPQRSTVWXZ")
		confirmationCode, err := util.GetRandomString(8, alphabet...)
		if err != nil {
			return err
		}
		code, err := util.GetRandomString(32)
		if err != nil {
			return err
		}

		c.log.Info("code: ", code)
		c.log.Info("confirmation code: ", confirmationCode)

		// TODO: colin - implement send email with magic link
		emailCmd := notifications.SendEmailCommand{
			To:       []string{email},
			Template: "passwordless_verify_existing_user",
			Data: map[string]any{
				"Email":            email,
				"ConfirmationCode": confirmationCode,
				"Code":             code,
			},
		}

		err = c.notificationService.SendEmailCommandHandler(ctx, &emailCmd)
		if err != nil {
			return err
		}

		value := &PasswordlessCacheEntry{
			Email:            email,
			ConfirmationCode: confirmationCode,
			SentDate:         time.Now().Format(time.RFC3339),
		}
		valueBytes, err := json.Marshal(value)
		if err != nil {
			return err
		}

		expire := time.Duration(20) * time.Minute
		c.cache.Set(ctx, fmt.Sprintf(passwordlessKeyPrefix, code), valueBytes, expire)
	}

	if tempUser != nil {
		// 3. if temp user, re-send invite with passwordless link
	}
	return nil
}

func (c *Passwordless) AuthenticatePasswordless(ctx context.Context, r *authn.Request, code string, confirmationCode string) (*authn.Identity, error) {
	// TODO: colin - validate login attempts for email instead of username

	// ok, err := c.loginAttempts.Validate(ctx, username)
	// if err != nil {
	// 	return nil, err
	// }
	// if !ok {
	// 	return nil, errPasswordlessAuthFailed.Errorf("too many consecutive incorrect login attempts for user - login for user temporarily blocked")
	// }

	if len(code) == 0 || len(confirmationCode) == 0 {
		return nil, errPasswordlessAuthFailed.Errorf("no code provided")
	}

	jsonData, err := c.cache.Get(ctx, code)
	if err != nil {
		return nil, err
	}
	var entry PasswordlessCacheEntry
	err = json.Unmarshal(jsonData, &entry)
	if err != nil {
		return nil, fmt.Errorf("failed to parse entry from passwordless cache: %w - entry: %s", err, string(jsonData))
	}

	if entry.ConfirmationCode != confirmationCode {
		return nil, errInvalidPasswordless
	}

	err = c.cache.Delete(ctx, code)
	if err != nil {
		return nil, err
	}

	usr, err := c.userService.GetByEmail(ctx, &user.GetUserByEmailQuery{Email: entry.Email})
	if err != nil {
		return nil, err
	}

	// user was found so set auth module in req metadata
	r.SetMeta(authn.MetaKeyAuthModule, "passwordless")

	return &authn.Identity{
		ID:              identity.NewTypedID(identity.TypeUser, usr.ID),
		OrgID:           r.OrgID,
		ClientParams:    authn.ClientParams{FetchSyncedUser: true, SyncPermissions: true},
		AuthenticatedBy: login.PasswordlessAuthModule,
	}, nil
}
