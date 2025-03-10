import { Mastra, MastraStorageLibSql } from '@mastra/core';
import { Memory } from '@mastra/memory';
import { UpstashStore } from '@mastra/upstash';

import { dane, daneChangeLog, daneCommitMessage, daneIssueLabeler, daneLinkChecker } from './agents/index.js';
import { daneNewContributor } from './agents/new-contributor.js';
import { danePackagePublisher } from './agents/package-publisher.js';
import { changelogWorkflow } from './workflows/changelog.js';
import { githubFirstContributorMessage } from './workflows/first-contributor.js';
import { messageWorkflow, githubIssueLabeler, commitMessageGenerator } from './workflows/index.js';
import { linkCheckerWorkflow } from './workflows/link-checker.js';
import { packagePublisher } from './workflows/publish-packages.js';
import { telephoneGameWorkflow } from './workflows/telephone-game.js';

export const mastra = new Mastra({
  agents: {
    dane,
    danePackagePublisher,
    daneLinkChecker,
    daneIssueLabeler,
    daneCommitMessage,
    daneChangeLog,
    daneNewContributor,
  },
  storage: new MastraStorageLibSql({
    config: {
      url: ':memory:',
    },
  }),
  memory: new Memory({
    storage: new UpstashStore({
      url: 'http://localhost:8079',
      token: `example_token`,
      // TODO: do we need to implement this in Memory?
      // maxTokens: 39000,
    }),
  }),
  workflows: {
    message: messageWorkflow,
    githubIssueLabeler: githubIssueLabeler,
    commitMessage: commitMessageGenerator,
    packagePublisher: packagePublisher,
    telephoneGame: telephoneGameWorkflow,
    changelog: changelogWorkflow,
    githubFirstContributorMessage: githubFirstContributorMessage,
    linkChecker: linkCheckerWorkflow,
  },
});
