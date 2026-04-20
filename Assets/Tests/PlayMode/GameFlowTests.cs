using UnityEngine;
using NUnit.Framework;
using System.Collections;
using UnityEngine.TestTools;

// this is really count as an integration test
// this is meant to replicate things like getting score, dying, starting a game properly
// not as a way of trying to replicate a player playing the game.

[TestFixture]
public class GameFlowTests
{
    private GameObject gameManagerObject;
    private GameManager  gameManager;
    private GameObject birdObject;
    private BirdController bird;
    private Rigidbody2D birdRb;
    private GameObject spawnerObject;
    private PipeSpawner pipeSpawner;
    private GameObject scoreManagerObject;
    private ScoreManager scoreManager;
    
    // we use IEnumerator as we need time
    [UnitySetUp]
    public IEnumerator SetUp()
    {
        PlayerPrefs.DeleteKey("FlappyHighScore");
        
        scoreManagerObject = new GameObject("ScoreManager");
        scoreManager = scoreManagerObject.AddComponent<ScoreManager>();
        
        // We are doing everything in code
        birdObject = new GameObject("Bird");
        birdObject.AddComponent<CircleCollider2D>();
        birdRb = birdObject.AddComponent<Rigidbody2D>();
        birdRb.gravityScale = 0f;
        bird = birdObject.AddComponent<BirdController>();
        
        spawnerObject = new GameObject("PipeSpawner");
        pipeSpawner = spawnerObject.AddComponent<PipeSpawner>();
        
        gameManagerObject = new GameObject("GameManager");
        gameManager = gameManagerObject.AddComponent<GameManager>();
        
        SetPrivateField(gameManager, "bird", bird);
        SetPrivateField(gameManager, "pipeSpawner", pipeSpawner);

        yield return null;
    }

    [TearDown]
    public void TearDown()
    {
        if(gameManagerObject != null) Object.Destroy(gameManagerObject);
        if(birdObject != null) Object.Destroy(birdObject);
        if(spawnerObject != null) Object.Destroy(spawnerObject);
        if(scoreManagerObject != null) Object.Destroy(scoreManagerObject);

        foreach (var pipe in Object.FindObjectsByType<Pipe>(FindObjectsSortMode.None))
            Object.Destroy(pipe.gameObject);
        
        PlayerPrefs.DeleteKey("FlappyHighScore");
    }

    [UnityTest]
    public IEnumerator Game_StartsInIdleState()
    {
        yield return null;
        
        Assert.AreEqual(GameManager.GameState.Idle, gameManager.State, "Game should begin in idle state");
    }

    [UnityTest]
    public IEnumerator Score_StartsAtZero()
    {
        yield return null;
        
        Assert.AreEqual(0, scoreManager.GetCurrentScore(), "Score should start at 0.");
    }

    [UnityTest]
    public IEnumerator OnBirdDied_TransistionsToGameOver()
    {
        SetState(gameManager, GameManager.GameState.Playing);
        yield return null;
        
        gameManager.OnBirdDied();
        yield return null;
        
        Assert.AreEqual(GameManager.GameState.GameOver, gameManager.State, "OnBirdDied should set state to GameOver");
    }

    [UnityTest]
    public IEnumerator OnBirdDied_CalledTwice_DoesNotCrash()
    {
        SetState(gameManager, GameManager.GameState.Playing);
        yield return null;
        
        gameManager.OnBirdDied();
        gameManager.OnBirdDied();

        yield return null;
        
        Assert.AreEqual(GameManager.GameState.GameOver, gameManager.State, "Double OnBirdDied should not corrupt state");
    }

    [UnityTest]
    public IEnumerator AddPoint_DuringPlay_IncreaseScore()
    {
        yield return null;
        
        scoreManager.ResetScore();
        scoreManager.AddPoint();
        scoreManager.AddPoint();
        
        Assert.AreEqual(2, scoreManager.GetCurrentScore(), "Score Should be at two");        
    }

    [UnityTest]
    public IEnumerator HighScore_PersistsBetweenRounds()
    {
        yield return null;
        
        scoreManager.ResetScore();

        for (int i = 0; i < 5; i++)
            scoreManager.AddPoint();
        
        scoreManager.SaveHighScore();

        Assert.AreEqual(5, scoreManager.GetHighScore(), "HighScore be at 5.");        
        
        scoreManager.ResetScore();

        for (int i = 0; i < 3; i++)
            scoreManager.AddPoint();
        
        scoreManager.SaveHighScore();

        Assert.AreEqual(5, scoreManager.GetHighScore(), "HighScore should still be at 5 after lower score write attempt.");        
    }

    private void SetPrivateField(object target, string fieldName, object value)
    {
        var field = target.GetType().GetField(fieldName,
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance
            );
        
        field?.SetValue(target, value);
    }

    private void SetState(GameManager gm, GameManager.GameState state)
    {
        // if the devs change the name to something else this breaks :D
        var field = typeof(GameManager).GetField("<State>k__BackingField",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance
            );
     
        field?.SetValue(gm, state);
    }
}
