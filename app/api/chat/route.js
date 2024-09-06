import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { marked } from 'marked';

const Prompt = `
You are an AI assistant helping students find professors based on their queries. Use a RAG system to provide the top most relevant professors for each query.

Response Format:
For each query , list the top professors with:

Professor Name/n

Department: [Department]/n

Rating: [X.X/5.0]/n

Strengths: [2-3 strengths]/n

Quote: "[Quote from review]"/n

Summary: [1 sentences]/n

Guidelines:
Be accurate and objective.
Ask for clarification if needed.
Provide fewer than 3 professors if necessary.
Maintain privacy and data protection.

Your goal is to help students make informed decisions about their education.
Else, if asked greatings, be nice and communicate greetings back

`

const systemPrompt = marked(Prompt);
export async function POST(req){
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })

    const index = pc.index('rag').namespace('ns1')
    const openai = new OpenAI()

    const text = data[data.length - 1].content

    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
    })

    const results = await index.query({
        topK: 3,
        includeMetadata:true,
        vector:embedding.data[0].embedding
    })

    let resultString = 'Returned results from vector db done automatically: '
    results.matches.forEach((match) =>{
        resultString += `\n
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Subject:${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n
        `
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1)

    const completion = await openai.chat.completions.create({
        messages : [
            {role:'system', content:systemPrompt},
            ...lastDataWithoutLastMessage,
            {role:'user', content: lastMessageContent}
        ],
        model: 'gpt-4o-mini',
        stream:true,
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try{
                for await (const chunk of completion){
                    const content = chunk.choices[0]?.delta?.content
                    if(content){
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            }catch(err){
                controller.error(err)
            }finally {
                controller.close()
            }

        },
    })
    return new NextResponse(stream)
}