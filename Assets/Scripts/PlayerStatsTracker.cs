using UnityEngine;

public class PlayerStatsTracker : MonoBehaviour
{
    public static PlayerStatsTracker instance { get; private set; }

    public int PlayerJumps { get; private set; } = 0;
    public int PlayerClicks { get; private set; } = 0;

    private void Awake()
    {
        if (instance)
        {
            Debug.LogWarning("PlayerStatsTracker: There is already an instance in the scene!");
            Destroy(this.gameObject);
            return;
        }

        instance = this;
    }

    public void AddJump(int numJump = 1)
    {
        PlayerJumps += numJump;
    }

    public void AddClicks(int numClicks = 1)
    {
        PlayerClicks += numClicks;
    }

    private void Update()
    {
        ListenForClicks();
    }

    public void ResetStats()
    {
        PlayerJumps = 0;
        PlayerClicks = 0;
    }

    private void ListenForClicks()
    {
        bool clickInput = Input.GetKeyDown(KeyCode.Space)
              || Input.GetMouseButtonDown(0)
              || (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began);

        if (clickInput)
            AddClicks();
    }
}
