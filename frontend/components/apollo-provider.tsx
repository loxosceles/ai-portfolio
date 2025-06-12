"use client";

import { ApolloProvider } from "@apollo/client";
import { useEffect, useState } from "react";
import { client } from "./apollo-client"; 

export default function GraphQLProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Connect to VSCode DevTools in development
    if (process.env.NODE_ENV === "development") {
      import("@apollo/client-devtools-vscode")
        .then(({ connectApolloClientToVSCodeDevTools }) => {
          connectApolloClientToVSCodeDevTools(
            client,
            "ws://localhost:7095",
          );
        })
        .catch((error) => {
          console.log("VSCode DevTools not available:", error.message);
        });
    }
  }, []);

  // Only render Apollo Provider on the client
  if (!isClient) {
    return <>{children}</>;
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
