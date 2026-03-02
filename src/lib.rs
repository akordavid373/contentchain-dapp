use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec, Map};

// Contract structure for Stellar blockchain
#[contract]
pub struct ContentChainStellar {
    // Storage for content metadata
    contents: Map<u64, Content>,
    // Storage for user subscriptions
    subscriptions: Map<Address, Vec<Subscription>>,
    // Storage for creator earnings
    creator_earnings: Map<Address, u64>,
    // Content counter
    content_counter: u64,
}

// Content structure for Stellar
#[derive(Clone)]
pub struct Content {
    pub id: u64,
    pub creator: Address,
    pub ipfs_hash: Symbol,
    pub base_price: u64,  // Price in stroops (1 stroop = 0.0000001 XLM)
    pub total_tips: u64,
    pub subscription_revenue: u64,
    pub is_active: bool,
    pub created_at: u64,
}

// Subscription structure for Stellar
#[derive(Clone)]
pub struct Subscription {
    pub content_id: u64,
    pub subscriber: Address,
    pub tier_index: u8,
    pub start_date: u64,
    pub last_payment: u64,
    pub is_active: bool,
    pub monthly_rate: u64,
}

// Subscription tiers for Stellar
pub struct SubscriptionTier {
    pub name: Symbol,
    pub monthly_rate: u64,  // in stroops
    pub benefits: Vec<Symbol>,
    pub is_active: bool,
}

#[contractimpl]
impl ContentChainStellar {
    // Initialize the contract
    pub fn __init(env: Env) {
        ContentChainStellar {
            contents: Map::new(&env),
            subscriptions: Map::new(&env),
            creator_earnings: Map::new(&env),
            content_counter: 0,
        };
    }

    // Create new content on Stellar
    pub fn create_content(
        env: Env,
        creator: Address,
        ipfs_hash: Symbol,
        base_price: u64,
    ) -> u64 {
        let content_id = env.storage().instance().get(&Symbol::new(&env, "content_counter")).unwrap_or(0) + 1;
        
        let content = Content {
            id: content_id,
            creator: creator.clone(),
            ipfs_hash,
            base_price,
            total_tips: 0,
            subscription_revenue: 0,
            is_active: true,
            created_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&Symbol::new(&env, &content_id.to_string()), &content);
        env.storage().instance().set(&Symbol::new(&env, "content_counter"), &content_id);

        // Add to creator's content list
        let mut creator_contents: Vec<u64> = env.storage().instance()
            .get(&Symbol::new(&env, &creator.to_string()))
            .unwrap_or(Vec::new(&env));
        creator_contents.push_back(content_id);
        env.storage().instance().set(&Symbol::new(&env, &creator.to_string()), &creator_contents);

        content_id
    }

    // Create subscription on Stellar
    pub fn create_subscription(
        env: Env,
        subscriber: Address,
        content_id: u64,
        tier_index: u8,
    ) -> Result<(), Symbol> {
        // Get content
        let content: Content = env.storage().instance()
            .get(&Symbol::new(&env, &content_id.to_string()))
            .ok_or(Symbol::new(&env, "Content not found"))?;

        if !content.is_active {
            return Err(Symbol::new(&env, "Content not active"));
        }

        // Get subscription tier
        let tier = Self::get_subscription_tier(env, tier_index)?;
        
        // Check if user already has subscription
        let user_subs: Vec<Subscription> = env.storage().instance()
            .get(&Symbol::new(&env, &subscriber.to_string()))
            .unwrap_or(Vec::new(&env));

        for sub in user_subs.iter() {
            if sub.content_id == content_id && sub.is_active {
                return Err(Symbol::new(&env, "Already subscribed"));
            }
        }

        // Create new subscription
        let subscription = Subscription {
            content_id,
            subscriber: subscriber.clone(),
            tier_index,
            start_date: env.ledger().timestamp(),
            last_payment: env.ledger().timestamp(),
            is_active: true,
            monthly_rate: tier.monthly_rate,
        };

        // Process payment (would involve Stellar payment processing)
        Self::process_payment(env, &content.creator, tier.monthly_rate)?;

        // Add to user's subscriptions
        let mut user_subs: Vec<Subscription> = env.storage().instance()
            .get(&Symbol::new(&env, &subscriber.to_string()))
            .unwrap_or(Vec::new(&env));
        user_subs.push_back(subscription);
        env.storage().instance().set(&Symbol::new(&env, &subscriber.to_string()), &user_subs);

        // Update content subscription revenue
        let mut updated_content = content;
        updated_content.subscription_revenue += tier.monthly_rate;
        env.storage().instance().set(&Symbol::new(&env, &content_id.to_string()), &updated_content);

        // Update creator earnings
        let current_earnings: u64 = env.storage().instance()
            .get(&Symbol::new(&env, &content.creator.to_string()))
            .unwrap_or(0);
        env.storage().instance().set(&Symbol::new(&env, &content.creator.to_string()), &(current_earnings + tier.monthly_rate));

        Ok(())
    }

    // Tip content creator on Stellar
    pub fn tip_content(
        env: Env,
        tipper: Address,
        content_id: u64,
        amount: u64,
    ) -> Result<(), Symbol> {
        let content: Content = env.storage().instance()
            .get(&Symbol::new(&env, &content_id.to_string()))
            .ok_or(Symbol::new(&env, "Content not found"))?;

        // Process payment to creator
        Self::process_payment(env, &content.creator, amount)?;

        // Update content tips
        let mut updated_content = content;
        updated_content.total_tips += amount;
        env.storage().instance().set(&Symbol::new(&env, &content_id.to_string()), &updated_content);

        // Update creator earnings
        let current_earnings: u64 = env.storage().instance()
            .get(&Symbol::new(&env, &content.creator.to_string()))
            .unwrap_or(0);
        env.storage().instance().set(&Symbol::new(&env, &content.creator.to_string()), &(current_earnings + amount));

        Ok(())
    }

    // Get subscription tiers on Stellar
    pub fn get_subscription_tier(env: Env, tier_index: u8) -> Result<SubscriptionTier, Symbol> {
        match tier_index {
            0 => Ok(SubscriptionTier {
                name: Symbol::new(&env, "Basic"),
                monthly_rate: 100000000,  // 0.01 XLM in stroops
                benefits: vec![
                    Symbol::new(&env, "Access to all content"),
                ],
                is_active: true,
            }),
            1 => Ok(SubscriptionTier {
                name: Symbol::new(&env, "Premium"),
                monthly_rate: 500000000,  // 0.05 XLM in stroops
                benefits: vec![
                    Symbol::new(&env, "Exclusive content"),
                    Symbol::new(&env, "Early access"),
                ],
                is_active: true,
            }),
            2 => Ok(SubscriptionTier {
                name: Symbol::new(&env, "Supporter"),
                monthly_rate: 1000000000,  // 0.1 XLM in stroops
                benefits: vec![
                    Symbol::new(&env, "All benefits"),
                    Symbol::new(&env, "Direct messaging"),
                    Symbol::new(&env, "Custom requests"),
                ],
                is_active: true,
            }),
            _ => Err(Symbol::new(&env, "Invalid tier")),
        }
    }

    // Get user subscriptions on Stellar
    pub fn get_user_subscriptions(env: Env, user: Address) -> Vec<Subscription> {
        env.storage().instance()
            .get(&Symbol::new(&env, &user.to_string()))
            .unwrap_or(Vec::new(&env))
    }

    // Get content details on Stellar
    pub fn get_content(env: Env, content_id: u64) -> Option<Content> {
        env.storage().instance()
            .get(&Symbol::new(&env, &content_id.to_string()))
    }

    // Get all content on Stellar
    pub fn get_all_content(env: Env) -> Vec<Content> {
        let content_counter: u64 = env.storage().instance()
            .get(&Symbol::new(&env, "content_counter"))
            .unwrap_or(0);
        
        let mut all_content = Vec::new(&env);
        for i in 1..=content_counter {
            if let Some(content) = Self::get_content(env.clone(), i) {
                all_content.push_back(content);
            }
        }
        all_content
    }

    // Process payment on Stellar (simplified)
    fn process_payment(env: Env, recipient: &Address, amount: u64) -> Result<(), Symbol> {
        // Record the payment event
        env.events().publish(
            (Symbol::new(&env, "payment"), recipient.clone()),
            amount,
        );
        
        Ok(())
    }

    // Cancel subscription on Stellar
    pub fn cancel_subscription(
        env: Env,
        subscriber: Address,
        content_id: u64,
    ) -> Result<(), Symbol> {
        let mut user_subs: Vec<Subscription> = env.storage().instance()
            .get(&Symbol::new(&env, &subscriber.to_string()))
            .ok_or(Symbol::new(&env, "No subscriptions found"))?;

        // Find and deactivate subscription
        let mut found = false;
        for mut sub in user_subs.iter_mut() {
            if sub.content_id == content_id && sub.is_active {
                sub.is_active = false;
                found = true;
                break;
            }
        }

        if !found {
            return Err(Symbol::new(&env, "Subscription not found"));
        }

        // Update storage
        env.storage().instance().set(&Symbol::new(&env, &subscriber.to_string()), &user_subs);

        Ok(())
    }
}
