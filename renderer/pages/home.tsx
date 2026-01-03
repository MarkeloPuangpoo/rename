import React from 'react';
import Head from 'next/head';
import CreateRenamePage from '../components/CreateRenamePage';

export default function HomePage() {
  return (
    <React.Fragment>
      <Head>
        <title>Renamer - Local Files</title>
      </Head>
      <CreateRenamePage />
    </React.Fragment>
  );
}
