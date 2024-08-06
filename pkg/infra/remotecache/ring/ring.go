package ring

import (
	"net"
	"time"

	"github.com/go-kit/log"
	"github.com/grafana/dskit/kv"
	"github.com/grafana/dskit/ring"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	ringName = "cache_ring"
	ringKey  = "cache/ring"
)

type ringConfig struct {
	Addr string
	Port string
}

func newRing(cfg ringConfig, logger log.Logger, client kv.Client, reg prometheus.Registerer) (*ring.Ring, *ring.BasicLifecycler, error) {
	var ringConfig ring.Config
	ringConfig.ReplicationFactor = 1
	hring, err := ring.NewWithStoreClientAndStrategy(
		ringConfig,
		ringName,
		ringKey,
		client,
		ring.NewDefaultReplicationStrategy(),
		reg,
		log.With(logger, "component", "ring"),
	)

	if err != nil {
		return nil, nil, err
	}

	var config ring.BasicLifecyclerConfig
	config.ID = cfg.Addr
	config.Addr = net.JoinHostPort(cfg.Addr, cfg.Port)

	var delegate ring.BasicLifecyclerDelegate
	delegate = ring.NewInstanceRegisterDelegate(ring.ACTIVE, 128)
	delegate = ring.NewLeaveOnStoppingDelegate(delegate, logger)
	delegate = ring.NewAutoForgetDelegate(1*time.Minute, delegate, logger)

	lfc, err := ring.NewBasicLifecycler(
		config,
		ringName,
		ringKey,
		client,
		delegate,
		log.With(logger, "component", "lifecycler"),
		reg,
	)

	if err != nil {
		return nil, nil, err
	}

	return hring, lfc, nil
}