export const handler = async (event) => {
  console.log('Link Generator Lambda invoked:', JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Link Generator Lambda - Basic structure created',
      stage: process.env.ENVIRONMENT
    })
  };
};