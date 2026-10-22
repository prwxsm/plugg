import sql from "@/lib/db";

export async function handlePlayRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as {
      trackId: string;
      durationPlayedSeconds?: number;
      sessionId?: string;
      userId?: string;
    };

    const { trackId, durationPlayedSeconds = 0, sessionId, userId } = body;

    if (!trackId) {
      return new Response(JSON.stringify({ error: "trackId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Play count rule: Must have played at least 30 seconds (or complete track if shorter)
    if (durationPlayedSeconds < 30) {
      return new Response(
        JSON.stringify({
          counted: false,
          reason: "Duration less than 30s threshold",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Anti-gaming: Check if this session already logged a play for this track in the last 30 minutes
    const effectiveSessionId = sessionId || "anon";
    if (effectiveSessionId !== "anon" || userId) {
      const [recentPlay] = await sql`
        SELECT id FROM plays
        WHERE track_id = ${trackId}
          AND (
            (${effectiveSessionId !== "anon"} AND session_id = ${effectiveSessionId})
            OR (${Boolean(userId)} AND user_id = ${userId || null})
          )
          AND created_at > now() - INTERVAL '30 minutes'
        LIMIT 1
      `;

      if (recentPlay) {
        return new Response(
          JSON.stringify({
            counted: false,
            reason: "Play already counted in this session within last 30 minutes",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Get track and artist
    const [track] = await sql<{ id: string; artistId: string; playCount: string | number }[]>`
      SELECT id, artist_id, play_count FROM tracks WHERE id = ${trackId} LIMIT 1
    `;

    if (!track) {
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const playId = crypto.randomUUID();

    // Perform updates in transaction
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO plays (
          id, track_id, user_id, session_id, duration_played_seconds
        )
        VALUES (
          ${playId}, ${trackId}, ${userId || null}, ${sessionId || null}, ${durationPlayedSeconds}
        )
      `;

      await tx`
        UPDATE tracks
        SET play_count = play_count + 1
        WHERE id = ${trackId}
      `;

      await tx`
        UPDATE artists
        SET total_plays = total_plays + 1
        WHERE id = ${track.artistId}
      `;

      // Also update artist_analytics if exists
      await tx`
        UPDATE artist_analytics
        SET total_plays = total_plays + 1
        WHERE artist_id = ${track.artistId}
      `;
    });

    const newPlayCount = Number(track.playCount) + 1;

    return new Response(
      JSON.stringify({
        success: true,
        counted: true,
        playId,
        trackId,
        newPlayCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Play handler error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to record play" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
