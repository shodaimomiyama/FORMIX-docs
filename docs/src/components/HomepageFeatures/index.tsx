import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './styles.module.css';

type FeatureItem = {
  emoji: string;
  title: ReactNode;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    emoji: '🔐',
    title: (
      <Translate id="homepage.features.noKeyServers.title">
        No Key-Management Servers
      </Translate>
    ),
    description: (
      <Translate id="homepage.features.noKeyServers.description">
        Keys are generated and split client-side; re-encryption runs in
        ephemeral AO processes, so there is no long-lived key custodian.
      </Translate>
    ),
  },
  {
    emoji: '🌐',
    title: (
      <Translate id="homepage.features.censorshipResistant.title">
        Censorship-Resistant & Always On
      </Translate>
    ),
    description: (
      <Translate id="homepage.features.censorshipResistant.description">
        Runs entirely on Arweave storage and the AO Network, so no single
        operator can take the data or access control offline.
      </Translate>
    ),
  },
  {
    emoji: '🧩',
    title: (
      <Translate id="homepage.features.thresholdAccess.title">
        k-of-n Threshold Access
      </Translate>
    ),
    description: (
      <Translate id="homepage.features.thresholdAccess.description">
        Shamir secret sharing combined with Umbral proxy re-encryption ensures
        that fewer than k participants can never recover the plaintext.
      </Translate>
    ),
  },
];

function Feature({emoji, title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <span
          className={styles.featureEmoji}
          role="img"
          aria-label={translate({
            id: 'homepage.features.emojiLabel',
            message: 'Feature icon',
          })}>
          {emoji}
        </span>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
